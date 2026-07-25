require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));


const dbConfig = {
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  password: process.env.PGPASSWORD || 'postgres',
  port: process.env.PGPORT || 5432,
};
const TARGET_DB = process.env.PGDATABASE || 'healthcare_crm';

const { initDB } = require('./config/db');

const startServer = async () => {
  try {
    await initDB();
    
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/users', require('./routes/users'));
    app.use('/api/leads', require('./routes/leads'));
    app.use('/api/demos', require('./routes/demos'));
    app.use('/api/activity', require('./routes/activity'));
    app.use('/api/admin', require('./routes/users')); // Alias for admin user routes
    app.use('/api/performance', require('./routes/performance'));
    app.use('/api/reports', require('./routes/reports'));
    app.use('/api/tech-team', require('./routes/techTeam'));
    app.use('/api/notifications', require('./routes/notifications'));

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
