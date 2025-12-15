const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Connect to MySQL without selecting database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'Salang@0810'
    });

    console.log('Connected to MySQL server');

    // Create database
    await connection.execute('CREATE DATABASE IF NOT EXISTS waste_management');
    console.log('Database created or already exists');

    // Use the database
    await connection.execute('USE waste_management');
    console.log('Using waste_db database');

    // Create tables (use the SQL schema from above)
    const schemaSQL = `
      -- Your complete SQL schema from above goes here
      -- Copy and paste the entire SQL schema here
    `;

    // Split by semicolon and execute each statement
    const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement);
      }
    }

    console.log('All tables created successfully');
    console.log('✅ Database setup completed!');

    await connection.end();
  } catch (error) {
    console.error('❌ Database setup failed:', error);
  }
}

setupDatabase();