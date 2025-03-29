require('dotenv').config();
const nodemailer = require('nodemailer');
const { Pool } = require('pg');

async function sendRerouteEmail() {
  console.log('Sending rerouted email notification');
  
  try {
    // Create database connection
    const pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'fiservinventory',
      password: process.env.DB_PASSWORD || '1234',
      ssl: false
    });
    
    // Get PO information
    const result = await pool.query(`
      SELECT po_id, po_number, status, approved_by
      FROM purchase_orders
      WHERE po_id = 181
    `);
    
    if (result.rows.length === 0) {
      console.log('Purchase order not found');
      return;
    }
    
    const po = result.rows[0];
    console.log('Found PO:', po);
    
    // Create email transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      debug: true
    });
    
    // Verify connection
    await transporter.verify();
    console.log('SMTP connection verified');
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
      to: process.env.REROUTE_EMAIL || 'ikerodz@gmail.com',
      subject: `Purchase Order #${po.po_number} Approved (Notification)`,
      html: `
        <h2>Purchase Order #${po.po_number}</h2>
        <p>This purchase order has been approved by ${po.approved_by}.</p>
        <p>Current status: ${po.status}</p>
        <p>This is a notification sent from the special rerouting script.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `
    });
    
    console.log('Email sent successfully:', info.messageId);
    
    // Close connections
    await pool.end();
    
  } catch (error) {
    console.error('Error sending reroute email:', error);
  }
}

sendRerouteEmail().catch(console.error); 