/**
 * Migration script to add role constraint to users table
 * Adds a CHECK constraint to ensure role is one of: 'admin', 'tech', 'purchasing'
 * Sets default role of 'tech' for users with null or empty roles
 */

const { pool } = require('../db');

async function migrateRoles() {
  const client = await pool.connect();
  
  try {
    // Start transaction
    await client.query('BEGIN');
    
    console.log('Starting role migration...');
    
    // 1. First update any NULL or empty roles to 'tech'
    const updateResult = await client.query(`
      UPDATE users 
      SET role = 'tech' 
      WHERE role IS NULL OR role = '';
    `);
    
    console.log(`Updated ${updateResult.rowCount} users with null or empty roles to 'tech'`);
    
    // 2. Check if the constraint already exists
    const checkConstraint = await client.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
      AND constraint_name = 'valid_role';
    `);
    
    // 3. If constraint doesn't exist, add it
    if (checkConstraint.rowCount === 0) {
      await client.query(`
        ALTER TABLE users
        ADD CONSTRAINT valid_role CHECK (role IN ('admin', 'tech', 'purchasing'));
      `);
      console.log('Added role constraint to users table');
    } else {
      console.log('Role constraint already exists');
    }
    
    // Commit the changes
    await client.query('COMMIT');
    console.log('Role migration completed successfully');
    
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error in role migration:', error);
    throw error;
  } finally {
    // Release the client back to the pool
    client.release();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateRoles()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = migrateRoles; 