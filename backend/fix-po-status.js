require('dotenv').config();
const { Pool } = require('pg');

async function fixPurchaseOrderStatus() {
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

    // Get all approved tracking records that don't have matching PO status
    console.log('Finding tracking records with approved status...');
    const result = await pool.query(`
      SELECT t.*, p.po_number, p.status as po_status, p.approval_status 
      FROM po_email_tracking t
      JOIN purchase_orders p ON t.po_id = p.po_id
      WHERE t.status = 'approved' 
      AND (p.status != 'approved' OR p.approval_status != 'approved' OR p.approval_status IS NULL)
    `);
    
    if (result.rows.length === 0) {
      console.log('No mismatched records found. All approved tracking records match their PO status.');
      return;
    }
    
    console.log(`Found ${result.rows.length} approved tracking records with mismatched PO status:`);
    for (const record of result.rows) {
      console.log(`PO #${record.po_number} (ID: ${record.po_id}) - Tracking Status: ${record.status}, PO Status: ${record.po_status}, PO Approval Status: ${record.approval_status || 'NULL'}`);
      
      // Update purchase order status to match tracking record
      console.log(`  - Updating PO status to 'approved'...`);
      const updateResult = await pool.query(`
        UPDATE purchase_orders
        SET status = 'approved', 
            approval_status = 'approved',
            approval_date = $1, 
            approved_by = $2,
            updated_at = NOW()
        WHERE po_id = $3
        RETURNING po_id, status, approval_status
      `, [record.approval_date || new Date(), record.approval_email, record.po_id]);
      
      console.log(`  - Update complete. New status: ${updateResult.rows[0].status}, Approval status: ${updateResult.rows[0].approval_status}`);
      
      // Now check if we need to reroute
      if (!record.rerouted_to && process.env.REROUTE_EMAIL) {
        console.log(`  - No rerouting info found. Attempting to reroute to ${process.env.REROUTE_EMAIL}...`);
        
        try {
          const emailService = require('./src/services/emailService');
          const rerouteResult = await emailService.reRouteApprovedPO(
            record.po_id,
            process.env.REROUTE_EMAIL, 
            record.tracking_code
          );
          console.log(`  - Rerouting successful:`, rerouteResult.success);
        } catch (rerouteError) {
          console.error(`  - Rerouting failed:`, rerouteError.message);
          
          // Try sending a simple notification instead
          try {
            const emailService = require('./src/services/emailService');
            console.log(`  - Sending fallback notification email...`);
            const info = await emailService.transporter.sendMail({
              from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
              to: process.env.REROUTE_EMAIL,
              subject: `Purchase Order #${record.po_number} Approved (Status Fix)`,
              html: `
                <h2>Purchase Order #${record.po_number}</h2>
                <p>This purchase order has been approved.</p>
                <p>This is a notification to inform you that the status was fixed in the system.</p>
              `
            });
            console.log(`  - Fallback notification sent:`, info.messageId);
          } catch (emailError) {
            console.error(`  - Fallback notification failed:`, emailError.message);
          }
        }
      } else if (record.rerouted_to) {
        console.log(`  - Already rerouted to ${record.rerouted_to}, skipping rerouting`);
      }
      
      console.log('---');
    }
    
    // Verify the fixes
    console.log('\nVerifying database status after fixes...');
    const verifyResult = await pool.query(`
      SELECT t.po_id, t.status as tracking_status, t.approval_email, 
             p.po_number, p.status as po_status, p.approval_status, p.approved_by
      FROM po_email_tracking t
      JOIN purchase_orders p ON t.po_id = p.po_id
      WHERE t.status = 'approved'
      ORDER BY t.approval_date DESC
    `);
    
    console.log('Current status of approved tracking records:');
    verifyResult.rows.forEach(row => {
      console.log(`PO #${row.po_number} (ID: ${row.po_id}) - Tracking Status: ${row.tracking_status}, PO Status: ${row.po_status}, PO Approval Status: ${row.approval_status || 'NULL'}, Approved by: ${row.approved_by || 'none'}`);
    });
    
    await pool.end();
    console.log('\nDatabase connection closed. Status fix complete.');
  } catch (error) {
    console.error('Error fixing purchase order status:', error);
  }
}

// Run the function
fixPurchaseOrderStatus().catch(console.error); 