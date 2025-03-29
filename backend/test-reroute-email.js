require('dotenv').config();
const { Pool } = require('pg');
const emailService = require('./src/services/emailService');
const emailTrackingService = require('./src/services/emailTrackingService');

async function testRerouteEmail() {
  console.log('Testing email rerouting functionality');
  console.log('-----------------------------------');
  console.log('Environment variables:');
  console.log('SMTP_HOST:', process.env.SMTP_HOST);
  console.log('SMTP_PORT:', process.env.SMTP_PORT);
  console.log('SMTP_USER:', process.env.SMTP_USER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  console.log('REROUTE_EMAIL:', process.env.REROUTE_EMAIL);
  console.log('-----------------------------------');
  
  try {
    // First, let's check which tracking records are in "approved" status
    const pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    
    console.log('Checking for approved tracking records...');
    const approvedResult = await pool.query(`
      SELECT t.*, p.po_number 
      FROM po_email_tracking t
      JOIN purchase_orders p ON t.po_id = p.po_id
      WHERE t.status = 'approved'
      ORDER BY t.approval_date DESC
      LIMIT 5
    `);
    
    if (approvedResult.rows.length === 0) {
      console.log('No approved tracking records found. Checking for any tracking records...');
      
      const anyResult = await pool.query(`
        SELECT t.*, p.po_number 
        FROM po_email_tracking t
        JOIN purchase_orders p ON t.po_id = p.po_id
        ORDER BY t.sent_date DESC
        LIMIT 5
      `);
      
      if (anyResult.rows.length === 0) {
        console.log('No tracking records found at all. Please check your database.');
        return;
      } else {
        console.log('Found tracking records, but none are approved:');
        anyResult.rows.forEach((row, i) => {
          console.log(`${i+1}. PO #${row.po_number} - Status: ${row.status} - Code: ${row.tracking_code}`);
        });
        
        // Choose the most recent record
        const testRecord = anyResult.rows[0];
        console.log(`Testing with record: PO #${testRecord.po_number} (${testRecord.tracking_code})`);
        
        // Attempt to force the rerouting
        try {
          console.log('Attempting to force reroute the selected tracking record...');
          const rerouteResult = await emailService.reRouteApprovedPO(
            testRecord.po_id,
            process.env.REROUTE_EMAIL,
            testRecord.tracking_code
          );
          console.log('Reroute result:', rerouteResult);
        } catch (rerouteError) {
          console.error('Error during forced reroute:', rerouteError);
        }
      }
    } else {
      console.log('Found approved tracking records:');
      approvedResult.rows.forEach((row, i) => {
        console.log(`${i+1}. PO #${row.po_number} - Approved by: ${row.approval_email} - Code: ${row.tracking_code}`);
      });
      
      // Choose the most recent record
      const testRecord = approvedResult.rows[0];
      console.log(`Testing with record: PO #${testRecord.po_number} (${testRecord.tracking_code})`);
      
      try {
        console.log('Attempting to reroute the selected approved tracking record...');
        const rerouteResult = await emailService.reRouteApprovedPO(
          testRecord.po_id,
          process.env.REROUTE_EMAIL,
          testRecord.tracking_code
        );
        console.log('Reroute result:', rerouteResult);
      } catch (rerouteError) {
        console.error('Error during reroute:', rerouteError);
      }
    }
    
    // Extra verification - try sending a direct test email
    try {
      console.log('Testing direct email sending to reroute address...');
      const testMailOptions = {
        from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
        to: process.env.REROUTE_EMAIL,
        subject: 'Test Email - Direct Send',
        html: '<p>This is a test email to verify direct sending works.</p>'
      };
      
      const info = await emailService.transporter.sendMail(testMailOptions);
      console.log('Direct test email sent successfully:', info.messageId);
    } catch (directEmailError) {
      console.error('Error sending direct test email:', directEmailError);
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error executing test:', error);
  }
}

testRerouteEmail().catch(console.error); 