/**
 * Database restore script for the Tech Inventory application
 * Usage: node restore-database.js [backup-file] [environment]
 * Where:
 *   backup-file is the path to the SQL backup file
 *   environment is one of: development, staging, production (defaults to development)
 */

require('dotenv').config({ path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env' });
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get backup file path from command line args
const backupFile = process.argv[2];
if (!backupFile) {
  console.error('Error: Backup file path must be provided.');
  console.error('Usage: node restore-database.js [backup-file] [environment]');
  process.exit(1);
}

// Check if the backup file exists
if (!fs.existsSync(backupFile)) {
  console.error(`Error: Backup file not found at ${backupFile}`);
  process.exit(1);
}

// Get environment from command line args or default to development
const environment = process.argv[3] || 'development';

// Load environment-specific config
require('dotenv').config({ path: `.env.${environment}` });

console.log(`Restoring database backup for '${environment}' environment...`);
console.log(`Database: ${process.env.DB_NAME}`);
console.log(`Backup file: ${backupFile}`);

// Use process.stdout to log confirmation message
process.stdout.write(`WARNING: This will overwrite the current database. Continue? (y/n) `);

// Read user input for confirmation
process.stdin.once('data', (data) => {
  const input = data.toString().trim().toLowerCase();
  
  if (input !== 'y' && input !== 'yes') {
    console.log('Restore canceled.');
    process.exit(0);
  }
  
  console.log('Restoring database...');
  
  // Check if we can connect to the database before restoring
  const pgCheck = spawn('psql', [
    `--dbname=postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    '--command=SELECT 1'
  ]);
  
  let connectionError = false;
  
  pgCheck.stderr.on('data', (data) => {
    console.error(`Connection error: ${data}`);
    connectionError = true;
  });
  
  pgCheck.on('close', (code) => {
    if (code !== 0 || connectionError) {
      console.error('Error: Could not connect to the database. Please check your credentials.');
      process.exit(1);
    }
    
    // If connection was successful, proceed with the restore
    const pgRestore = spawn('psql', [
      `--dbname=postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
      '--file=' + backupFile
    ]);
    
    pgRestore.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    
    pgRestore.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    
    pgRestore.on('close', (code) => {
      if (code === 0) {
        console.log(`Database restore completed successfully.`);
        
        // Create a restore log
        const restoreLogDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(restoreLogDir)) {
          fs.mkdirSync(restoreLogDir, { recursive: true });
        }
        
        const now = new Date();
        const timestamp = now.toISOString().replace(/:/g, '-');
        const logFile = path.join(restoreLogDir, `restore_${timestamp}.log`);
        
        const logData = {
          timestamp: now.toISOString(),
          environment,
          database: process.env.DB_NAME,
          backupFile,
          restoreStatus: 'success'
        };
        
        fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
        console.log(`Restore log created: ${logFile}`);
      } else {
        console.error(`Database restore failed with code ${code}`);
        process.exit(1);
      }
    });
  });
}); 