require('dotenv').config();
const { Pool } = require('pg');
const emailService = require('./src/services/emailService');
const emailTrackingService = require('./src/services/emailTrackingService');

async function reprocessApprovedEmails() {
  console.log('Reprocessing approved emails');
  console.log('-----------------------------------');
  
  try {
    // Connect to database
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    // Check for recent emails that are approved
    console.log('Checking for approved tracking records...');
    const result = await pool.query(`
      SELECT t.*, p.po_number 
      FROM po_email_tracking t
      JOIN purchase_orders p ON t.po_id = p.po_id
      WHERE t.status = 'approved'
      AND p.status = 'approved'
      ORDER BY t.approval_date DESC
      LIMIT 10
    `);
    
    if (result.rows.length === 0) {
      console.log('No approved tracking records found.');
      return;
    }
    
    console.log(`Found ${result.rows.length} approved tracking records:`);
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. PO #${row.po_number} - Approved by: ${row.approval_email} - Code: ${row.tracking_code}`);
    });
    
    for (const record of result.rows) {
      console.log(`\nProcessing PO #${record.po_number} (${record.tracking_code})...`);
      
      // Check if it has already been rerouted
      if (record.rerouted_tracking_code) {
        console.log(`This record has already been rerouted to ${record.rerouted_to} with tracking code ${record.rerouted_tracking_code}`);
        continue;
      }
      
      // Force re-routing
      console.log(`Forcing re-routing to ${process.env.REROUTE_EMAIL}...`);
      try {
        const rerouteResult = await emailService.reRouteApprovedPO(
          record.po_id,
          process.env.REROUTE_EMAIL,
          record.tracking_code
        );
        console.log('Re-routing successful:', rerouteResult);
      } catch (error) {
        console.error('Error re-routing:', error.message);
        
        // Try to send a simple notification email as fallback
        try {
          console.log('Attempting fallback notification email...');
          const testMailOptions = {
            from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
            to: process.env.REROUTE_EMAIL,
            subject: `PO #${record.po_number} Approved (Manual Notification)`,
            html: `
              <h2>Purchase Order #${record.po_number}</h2>
              <p>This purchase order has been approved.</p>
              <p>This is a manual notification because the automatic re-routing system encountered an error.</p>
              <p>Error: ${error.message}</p>
              <p>Please check the system for details.</p>
            `
          };
          
          const info = await emailService.transporter.sendMail(testMailOptions);
          console.log('Fallback notification email sent:', info.messageId);
        } catch (fallbackError) {
          console.error('Fallback notification also failed:', fallbackError.message);
        }
      }
    }
    
    await pool.end();
    console.log('\nProcessing completed.');
  } catch (error) {
    console.error('Error during reprocessing:', error);
  }
}

// Run the reprocessing function
reprocessApprovedEmails().catch(console.error); 