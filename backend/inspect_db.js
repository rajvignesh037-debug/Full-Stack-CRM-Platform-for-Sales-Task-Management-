require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'healthcare_crm'
});

async function main() {
  try {
    console.log("Connecting to database with config:", {
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      port: process.env.PGPORT,
      database: process.env.PGDATABASE
    });
    
    // Check users table columns
    const columnsRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users';
    `);
    console.log("Columns in 'users' table:");
    console.log(columnsRes.rows.map(c => `${c.column_name} (${c.data_type}, nullable: ${c.is_nullable})`).join('\n'));

    // Check existing users to see if account_id or emails clash
    const usersRes = await pool.query("SELECT id, name, email, role, account_id, is_active FROM users;");
    console.log("\nExisting users:");
    console.log(usersRes.rows);

    // Test insert
    console.log("\nTesting insertion...");
    const testUser = {
      name: "Test Intern",
      email: "test_intern_" + Date.now() + "@test.com",
      password_hash: "$2b$10$xyz",
      role: "intern",
      group_name: "Sales",
      job_type: null,
      account_id: "INT_TEST_" + Date.now()
    };
    const insertRes = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, group_name, job_type, account_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [testUser.name, testUser.email, testUser.password_hash, testUser.role, testUser.group_name, testUser.job_type, testUser.account_id]
    );
    console.log("Insert success, new ID:", insertRes.rows[0].id);

    // Clean up test user
    await pool.query("DELETE FROM users WHERE id = $1", [insertRes.rows[0].id]);
    console.log("Cleaned up test user.");

  } catch (err) {
    console.error("ERROR DETECTED:");
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
