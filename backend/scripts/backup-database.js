/**
 * Database backup script for the Tech Inventory application
 * Usage: node backup-database.js [environment]
 * Where environment is one of: development, staging, production (defaults to development)
 */

require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get environment from command line args or default to development
const environment = process.argv[2] || 'development';

// Load environment-specific config
require('dotenv').config({ path: `.env.${environment}` });

// Create backups directory if it doesn't exist
const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Format date for filename
const now = new Date();
const timestamp = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}`;

// Define backup filename
const filename = path.join(backupDir, `${process.env.DB_NAME}_${environment}_${timestamp}.sql`);

console.log(`Creating database backup for '${environment}' environment...`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Backup file: ${filename}`);

// Construct pg_dump command
const pgDump = spawn('pg_dump', [
  `--dbname=postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  '--format=plain',
  '--no-owner',
  '--no-acl',
  `--file=${filename}`
]);

pgDump.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

pgDump.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

pgDump.on('close', (code) => {
  if (code === 0) {
    console.log(`Database backup completed successfully: ${filename}`);
    // Create a metadata file with backup information
    const metaFilename = `${filename}.meta.json`;
    const metadata = {
      database: process.env.DB_NAME,
      environment,
      timestamp: now.toISOString(),
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      backupFile: filename
    };
    
    fs.writeFileSync(metaFilename, JSON.stringify(metadata, null, 2));
    console.log(`Metadata file created: ${metaFilename}`);
  } else {
    console.error(`Database backup failed with code ${code}`);
    process.exit(1);
  }
}); 