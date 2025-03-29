const nodemailer = require('nodemailer');
const emailTrackingService = require('./emailTrackingService');
const { Pool } = require('pg');

class EmailService {
  constructor() {
    // Initialize database pool
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    // Initialize primary email transporter with increased timeouts
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      // Significantly increase timeout settings
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000,   // 30 seconds
      socketTimeout: 60000,     // 60 seconds
      // Add TLS options for better security
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      },
      // Add pool configuration
      pool: true,               // Use pooled connections
      maxConnections: 5,        // Maximum number of connections to pool
      maxMessages: 100,         // Maximum number of messages per connection
      // Add debug option for troubleshooting
      debug: process.env.NODE_ENV === 'development'
    });
    
    // Create a fallback transporter for when primary fails
    // This uses a different service as backup
    if (process.env.FALLBACK_SMTP_HOST) {
      this.fallbackTransporter = nodemailer.createTransport({
        host: process.env.FALLBACK_SMTP_HOST,
        port: process.env.FALLBACK_SMTP_PORT,
        secure: process.env.FALLBACK_SMTP_SECURE === 'true',
        auth: {
          user: process.env.FALLBACK_SMTP_USER,
          pass: process.env.FALLBACK_SMTP_PASSWORD,
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        tls: {
          rejectUnauthorized: false
        }
      });
    }

    // Verify connection on startup
    this.verifyConnection();

    // Email recipients for inventory notifications
    this.notificationRecipients = process.env.NOTIFICATION_RECIPIENTS?.split(',') || [];
  }

  // Add a connection verification method
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
    } catch (error) {
      console.error('Failed to verify SMTP connection:', error);
      console.error('Please check your email configuration settings');
    }
  }

  async sendLowStockNotification(part) {
    const subject = `Low Stock Alert: ${part.name}`;
    const html = `
      <h2>Low Stock Alert</h2>
      <p>The following part is running low on stock:</p>
      <ul>
        <li><strong>Part Name:</strong> ${part.name}</li>
        <li><strong>Part Number:</strong> ${part.fiserv_part_number || 'N/A'}</li>
        <li><strong>Current Quantity:</strong> ${part.quantity}</li>
        <li><strong>Minimum Quantity:</strong> ${part.minimum_quantity}</li>
        <li><strong>Location:</strong> ${part.location || 'N/A'}</li>
      </ul>
      <p>Please restock this item soon to maintain adequate inventory levels.</p>
    `;

    return this.sendEmail(subject, html);
  }

  async sendOutOfStockNotification(part) {
    const subject = `Out of Stock Alert: ${part.name}`;
    const html = `
      <h2>Out of Stock Alert</h2>
      <p>The following part is now out of stock:</p>
      <ul>
        <li><strong>Part Name:</strong> ${part.name}</li>
        <li><strong>Part Number:</strong> ${part.fiserv_part_number || 'N/A'}</li>
        <li><strong>Minimum Quantity Required:</strong> ${part.minimum_quantity}</li>
        <li><strong>Location:</strong> ${part.location || 'N/A'}</li>
      </ul>
      <p>Please restock this item as soon as possible to prevent disruptions.</p>
    `;

    return this.sendEmail(subject, html);
  }

  async sendPurchaseOrderPDF(recipient, poNumber, pdfBase64, poId) {
    console.log('Starting sendPurchaseOrderPDF...');
    console.log('PO ID:', poId);
    console.log('PO Number:', poNumber);
    console.log('Recipient:', recipient);
    
    // Create tracking record
    console.log('Creating tracking record...');
    const trackingRecord = await emailTrackingService.createTrackingRecord(
      poId,
      recipient,
      `Purchase Order #${poNumber}`,
      pdfBase64
    );
    console.log('Tracking record created:', trackingRecord);

    const subject = `Purchase Order Request #${poNumber} [PO-APPROVAL-${trackingRecord.tracking_code}]`;
    console.log('Email subject:', subject);
    
    const html = `
      <h2>Purchase Order #${poNumber}</h2>
      <p>Please find attached the purchase order document for your review and approval.</p>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
        <h3>Approval Instructions</h3>
        <p>Please reply to this email with your decision. You can:</p>
        <ul>
          <li><strong>APPROVE:</strong> Include words like "approve", "accepted", "confirmed", etc. in your reply</li>
          <li><strong>PUT ON HOLD:</strong> Include words like "on hold", "need changes", "revise", etc. in your reply if changes are needed</li>
          <li><strong>REJECT:</strong> Include words like "reject", "denied", etc. in your reply</li>
        </ul>
        <p>You can include any additional comments or questions in your reply. The system will automatically process your response.</p>
        <p><strong>Note:</strong> Only the original recipient (${recipient}) can respond to this purchase order request.</p>
      </div>
      
      <p>This is an automated message from the Fiserv Inventory Management System.</p>
    `;

    try {
      console.log(`Attempting to send purchase order #${poNumber} to ${recipient}`);
      
      // Check for required data
      if (!pdfBase64) {
        throw new Error('PDF data is empty or null');
      }
      
      // Prepare email data
      const mailOptions = {
        from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
        to: recipient,
        subject,
        html,
        attachments: [
          {
            filename: `PO-${poNumber}.pdf`,
            content: pdfBase64,
            encoding: 'base64'
          }
        ]
      };
      
      // Implement retry logic with primary and fallback transporters
      let retries = 3;
      let lastError = null;
      let useFallback = false;
      
      while (retries > 0) {
        try {
          // Choose which transporter to use
          const transporter = useFallback && this.fallbackTransporter ? 
            this.fallbackTransporter : this.transporter;
          
          console.log(`Using ${useFallback ? 'fallback' : 'primary'} email transporter (${retries} retries left)`);
          
          const info = await transporter.sendMail(mailOptions);
          
          console.log('Purchase order email sent:', info.messageId);
          return info;
        } catch (err) {
          lastError = err;
          console.warn(`Email attempt failed (${retries} retries left):`, err.code || err.message);
          
          // Try fallback on next attempt if available
          if (this.fallbackTransporter && !useFallback) {
            console.log('Switching to fallback email transporter');
            useFallback = true;
          } else {
            retries--;
          }
          
          if (retries > 0) {
            const delay = useFallback ? 1000 : 3000;
            console.log(`Waiting ${delay}ms before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // If we reach here, all retries failed
      // Store the failed attempt for background processing
      await emailTrackingService.storeFailedEmailAttempt({
        recipient,
        subject,
        html,
        pdfBase64,
        poId,
        poNumber,
        errorMessage: lastError.message
      });

      // Start background retry process if not already running
      this.startBackgroundRetryProcess();

      throw lastError;
    } catch (error) {
      console.error('Error sending purchase order email:', error);
      console.error('Error details:', error.message);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      throw error;
    }
  }

  // Background retry process
  async startBackgroundRetryProcess() {
    if (this.retryProcessRunning) return;
    this.retryProcessRunning = true;

    const processFailedEmails = async () => {
      try {
        const failedAttempts = await emailTrackingService.getFailedEmailAttempts();
        
        for (const attempt of failedAttempts) {
          try {
            const mailOptions = {
              from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
              to: attempt.recipient,
              subject: attempt.subject,
              html: attempt.html_content,
              attachments: attempt.pdf_data ? [{
                filename: `PO-${attempt.po_number}.pdf`,
                content: attempt.pdf_data,
                encoding: 'base64'
              }] : []
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Retried email sent successfully:', info.messageId);
            await emailTrackingService.markEmailAttemptAsProcessed(attempt.id, true);
          } catch (error) {
            console.error('Error retrying failed email:', error);
            await emailTrackingService.markEmailAttemptAsProcessed(attempt.id, false);
          }
        }
      } catch (error) {
        console.error('Error in background retry process:', error);
      }
    };

    // Run immediately and then every 5 minutes
    await processFailedEmails();
    setInterval(processFailedEmails, 5 * 60 * 1000);
  }

  async reRouteApprovedPO(poId, newRecipient, originalTrackingCode) {
    try {
      console.log('Starting re-routing process...');
      console.log('PO ID:', poId);
      console.log('New recipient:', newRecipient);
      console.log('Original tracking code:', originalTrackingCode);
      console.log('SMTP Configuration:', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM
      });

      // Get the original tracking record with PDF data
      const originalRecord = await emailTrackingService.getTrackingRecordByCode(originalTrackingCode);
      console.log('Original record found:', !!originalRecord);
      console.log('Original record details:', {
        po_id: originalRecord?.po_id,
        status: originalRecord?.status,
        has_pdf: !!originalRecord?.pdf_data
      });
      
      if (!originalRecord) {
        throw new Error('Original tracking record not found');
      }

      // Get PO number from purchase_orders table
      const poResult = await this.pool.query(
        'SELECT po_number FROM purchase_orders WHERE po_id = $1',
        [poId]
      );
      
      if (poResult.rows.length === 0) {
        throw new Error('Purchase order not found');
      }
      
      const poNumber = poResult.rows[0].po_number;

      if (!originalRecord.pdf_data) {
        console.log('No PDF data in original record, attempting to regenerate...');
        try {
          // Try to regenerate the PDF
          const { generatePurchaseOrderPDF } = require('../utils/pdfGenerator');
          const poData = await this.getPurchaseOrderData(poId);
          const pdfBuffer = await generatePurchaseOrderPDF(poData);
          originalRecord.pdf_data = pdfBuffer.toString('base64');
          console.log('PDF regenerated successfully');
        } catch (pdfError) {
          console.error('Error regenerating PDF:', pdfError);
          throw new Error('Failed to regenerate PDF: ' + pdfError.message);
        }
      }

      if (!originalRecord.pdf_data) {
        throw new Error('Could not obtain PDF data for re-routing');
      }

      // Create new tracking record for re-routed email
      let newTrackingRecord;
      try {
        console.log('Creating new tracking record for re-routed email...');
        newTrackingRecord = await emailTrackingService.createTrackingRecord(
          poId,
          newRecipient,
          `Purchase Order #${poNumber} (Re-routed)`,
          originalRecord.pdf_data
        );
        console.log('New tracking record created:', newTrackingRecord);

        // Update original record with re-routing information
        console.log('Updating original record with re-routing info...');
        await emailTrackingService.updateReroutingInfo(
          originalTrackingCode,
          newRecipient,
          newTrackingRecord.tracking_code
        );
        console.log('Original record updated with rerouting info');
      } catch (trackingError) {
        console.error('Error creating/updating tracking records:', trackingError);
        console.error('Tracking error stack:', trackingError.stack);
        throw new Error('Failed to update tracking records: ' + trackingError.message);
      }

      // Send the re-routed email
      const subject = `Purchase Order #${poNumber} (Re-routed) [PO-APPROVAL-${newTrackingRecord.tracking_code}]`;
      
      const html = `
        <h2>Purchase Order #${poNumber}</h2>
        <p>This purchase order has been approved and re-routed for your review.</p>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px;">
          <h3>Approval Instructions</h3>
          <p>Please reply to this email with your decision. You can:</p>
          <ul>
            <li><strong>APPROVE:</strong> Include words like "approve", "accepted", "confirmed", etc. in your reply</li>
            <li><strong>PUT ON HOLD:</strong> Include words like "on hold", "need changes", "revise", etc. in your reply if changes are needed</li>
            <li><strong>REJECT:</strong> Include words like "reject", "denied", etc. in your reply</li>
          </ul>
          <p>You can include any additional comments or questions in your reply. The system will automatically process your response.</p>
          <p><strong>Note:</strong> Only the original recipient (${newRecipient}) can respond to this purchase order request.</p>
        </div>
        
        <p>This is an automated message from the Fiserv Inventory Management System.</p>
      `;

      try {
        console.log('Attempting to send re-routed email...');
        console.log('Email subject:', subject);
        console.log('Email recipient:', newRecipient);
        console.log('Transporter ready:', !!this.transporter);
        
        // Verify SMTP connection before sending
        try {
          console.log('Verifying SMTP connection...');
          await this.transporter.verify();
          console.log('SMTP connection verified successfully');
        } catch (verifyError) {
          console.error('SMTP verification failed:', verifyError);
          // Continue anyway and try to send
        }
        
        // Send the email with the PDF attachment
        const info = await this.transporter.sendMail({
          from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
          to: newRecipient,
          subject,
          html,
          attachments: [
            {
              filename: `PO-${poNumber}.pdf`,
              content: originalRecord.pdf_data,
              encoding: 'base64'
            }
          ]
        });
        console.log('Re-routed email sent successfully:', info.messageId);
        return {
          success: true,
          newTrackingCode: newTrackingRecord.tracking_code,
          message: 'Purchase order re-routed successfully',
          messageId: info.messageId
        };
      } catch (emailError) {
        console.error('Error sending re-routed email:', emailError);
        console.error('Error message:', emailError.message);
        console.error('Error stack:', emailError.stack);
        console.error('SMTP Error details:', {
          code: emailError.code,
          command: emailError.command,
          response: emailError.response,
          responseCode: emailError.responseCode
        });
        
        // Try with fallback transporter if available
        if (this.fallbackTransporter) {
          console.log('Attempting to send via fallback transporter...');
          try {
            const fallbackInfo = await this.fallbackTransporter.sendMail({
              from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
              to: newRecipient,
              subject,
              html,
              attachments: [
                {
                  filename: `PO-${poNumber}.pdf`,
                  content: originalRecord.pdf_data,
                  encoding: 'base64'
                }
              ]
            });
            console.log('Re-routed email sent via fallback successfully:', fallbackInfo.messageId);
            return {
              success: true,
              newTrackingCode: newTrackingRecord.tracking_code,
              message: 'Purchase order re-routed successfully (via fallback)',
              messageId: fallbackInfo.messageId
            };
          } catch (fallbackError) {
            console.error('Fallback email also failed:', fallbackError);
            // Throw the original error
          }
        }
        
        throw new Error('Failed to send re-routed email: ' + emailError.message);
      }
    } catch (error) {
      console.error('Error re-routing approved PO:', error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }

  async getPurchaseOrderData(poId) {
    const client = await this.pool.connect();
    try {
      // Get the purchase order details
      const poResult = await client.query(
        `SELECT po.*, 
                v.name as vendor_name,
                v.email as vendor_email,
                v.phone as vendor_phone,
                v.address as vendor_address
         FROM purchase_orders po
         LEFT JOIN vendors v ON po.vendor_id = v.vendor_id
         WHERE po.po_id = $1`,
        [poId]
      );

      if (poResult.rows.length === 0) {
        throw new Error('Purchase order not found');
      }

      const po = poResult.rows[0];

      // Get the parts for this PO
      const partsResult = await client.query(
        `SELECT p.*, po.quantity as order_quantity
         FROM parts p
         JOIN po_parts po ON p.part_id = po.part_id
         WHERE po.po_id = $1`,
        [poId]
      );

      return {
        ...po,
        parts: partsResult.rows
      };
    } finally {
      client.release();
    }
  }

  async sendEmail(subject, html, recipient = null) {
    // Use provided recipient or fall back to notification recipients
    const emailRecipients = recipient || this.notificationRecipients;
    
    if (!emailRecipients || (Array.isArray(emailRecipients) && emailRecipients.length === 0)) {
      console.warn('No notification recipients configured');
      return;
    }

    const to = Array.isArray(emailRecipients) ? emailRecipients.join(', ') : emailRecipients;
    
    try {
      console.log(`Sending email to: ${to}`);
      console.log(`Email configuration: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} (${process.env.SMTP_USER})`);
      
      // Implement retry logic
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          const info = await this.transporter.sendMail({
            from: process.env.SMTP_FROM || '"Fiserv Inventory" <ftenashville@gmail.com>',
            to,
            subject,
            html,
          });
          
          console.log('Email sent:', info.messageId);
          return info;
        } catch (err) {
          lastError = err;
          console.warn(`Email attempt failed (${retries} retries left):`, err.code || err.message);
          retries--;
          
          if (retries > 0) {
            // Wait 2 seconds before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // If we reach here, all retries failed
      throw lastError;
    } catch (error) {
      console.error('Error sending email:', error);
      console.error('Error details:', error.message);
      if (error.code) {
        console.error('Error code:', error.code);
      }
      throw error;
    }
  }
}

module.exports = new EmailService(); 