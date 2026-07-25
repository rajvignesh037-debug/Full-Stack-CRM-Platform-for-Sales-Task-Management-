const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
  ssl: process.env.PGHOST && process.env.PGHOST !== 'localhost' ? { rejectUnauthorized: false } : false
};
const TARGET_DB = process.env.PGDATABASE || 'healthcare_crm';

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
} else {
  pool = new Pool({ ...dbConfig, database: TARGET_DB });
}

async function seedUsers(client) {
  try {
    const usersToSeed = [
      { name: 'Admin User', email: 'ganeshboddeti05@gmail.com', password: 'Ganesh@8978', role: 'admin', account_id: 'ADMIN001' }
    ];

    for (const u of usersToSeed) {
      const check = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [u.email]);
      if (check.rowCount === 0) {
        const hash = await bcrypt.hash(u.password, 10);
        if (u.role === 'admin') {
          await client.query(
            `INSERT INTO users (name, email, password_hash, role, account_id) VALUES ($1, $2, $3, $4, $5)`,
            [u.name, u.email, hash, u.role, u.account_id]
          );
        } else {
          await client.query(
            `INSERT INTO users (name, email, password_hash, role, group_name, account_id) VALUES ($1, $2, $3, $4, $5, $6)`,
            [u.name, u.email, hash, u.role, u.group_name, u.account_id]
          );
        }
        console.log(`[Seed] Created user: ${u.email} (${u.password})`);
      }
    }
  } catch (err) {
    console.error('Error seeding database:', err.message);
  }
}

async function initDB() {
  try {
    if (!process.env.DATABASE_URL) {
      const tempPool = new Pool({ ...dbConfig, database: 'postgres' });
      const checkDb = await tempPool.query(`SELECT 1 FROM pg_database WHERE datname='${TARGET_DB}'`);
      if (checkDb.rowCount === 0) {
        await tempPool.query(`CREATE DATABASE ${TARGET_DB}`);
        console.log("Database created successfully");
      }
      await tempPool.end();
    }
  } catch (err) {
    console.log("Skipping database creation (likely already exists or permission denied on managed DB):", err.message);
  }

  try {

    const client = await pool.connect();
    console.log("Database connected successfully");

    const initSQL = fs.readFileSync(path.join(__dirname, '..', 'init.sql')).toString();
    await client.query(initSQL);
    console.log("Tables initialized successfully");

    // Optional Reset Mechanism
    if (process.env.RESET_DB_USERS === 'true') {
      console.log("[DB] Resetting users table as requested...");
      await client.query('DELETE FROM users');
    }

    await seedUsers(client);

    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_attempts INTEGER DEFAULT 0");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT TRUE");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE");
    await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS job_type VARCHAR(100)");
    await client.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS city VARCHAR(100)");
    await client.query("ALTER TABLE demos ADD COLUMN IF NOT EXISTS feedback TEXT");
    await client.query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE");

    // MIGRATION: Convert groups to Sales/Technical
    // 1. Migrate Sales (Group 1-5)
    await client.query(`
      UPDATE users 
      SET group_name = 'Sales' 
      WHERE group_name IN ('Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5')
    `);

    // 2. Migrate Technical (All others)
    // We preserve the old group name as job_type if it wasn't already set
    await client.query(`
      UPDATE users 
      SET job_type = group_name, group_name = 'Technical' 
      WHERE role = 'intern' 
      AND group_name NOT IN ('Sales', 'Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5')
      AND (job_type IS NULL OR job_type = '')
    `);

    // Technical Team Tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS tech_groups (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tech_tasks (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          assigned_to_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          group_id INTEGER REFERENCES tech_groups(id) ON DELETE SET NULL,
          due_date DATE,
          priority VARCHAR(50) DEFAULT 'Medium',
          status VARCHAR(50) DEFAULT 'Todo',
          admin_unread BOOLEAN DEFAULT FALSE,
          intern_unread BOOLEAN DEFAULT FALSE,
          last_submitted_at TIMESTAMP,
          attachments TEXT[],
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tech_task_comments (
          id SERIAL PRIMARY KEY,
          task_id INTEGER REFERENCES tech_tasks(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          comment TEXT NOT NULL,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tech_activities (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure 'Technical' group exists
    await client.query(`
      INSERT INTO tech_groups (name, description) 
      SELECT 'Technical', 'General technical team'
      WHERE NOT EXISTS (SELECT 1 FROM tech_groups WHERE name = 'Technical')
    `);

    // Point all tasks to 'Technical' group
    await client.query(`
      UPDATE tech_tasks 
      SET group_id = (SELECT id FROM tech_groups WHERE name = 'Technical')
      WHERE group_id IS NULL OR group_id NOT IN (SELECT id FROM tech_groups WHERE name = 'Technical')
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          type VARCHAR(50) NOT NULL,
          task_id INTEGER REFERENCES tech_tasks(id) ON DELETE CASCADE,
          demo_id INTEGER REFERENCES demos(id) ON DELETE CASCADE,
          sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          receiver_role VARCHAR(50) NOT NULL,
          receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title TEXT,
          message TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    client.release();
  } catch (err) {
    console.error("Database connection failed. Check .env credentials");
    console.error("Database initialization error:", err);
  }
}

module.exports = {
  pool,
  initDB,
  getClient: async () => await pool.connect(),
  runTransaction: async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};
