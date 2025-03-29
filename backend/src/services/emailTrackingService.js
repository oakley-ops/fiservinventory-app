// Ensure environment variables are loaded
require('dotenv').config();

const { Pool } = require('pg');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { generatePurchaseOrderPDF } = require('../utils/pdfGenerator');
// Add socket.io import for real-time notifications
const socketIo = global.io;

class EmailTrackingService {
  constructor() {
    // Log environment variables to verify they're loaded
    console.log('Email Tracking Service - Environment variables loaded:', {
      DB_USER: process.env.DB_USER,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: process.env.DB_PORT,
      DB_NAME: process.env.DB_NAME,
      DB_SSL: process.env.DB_SSL
    });

    // Use individual parameters for better control and debugging
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    // Test the connection
    this.pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Error connecting to database:', err);
      } else {
        console.log('Database connection pool initialized successfully:', res.rows[0]);
      }
    });
  }

  // Generate a unique tracking code
  generateTrackingCode() {
    return crypto.randomBytes(16).toString('hex');
  }

  // Create a new email tracking record
  async createTrackingRecord(poId, recipientEmail, subject, pdfData = null) {
    console.log('Creating tracking record in database...');
    console.log('PO ID:', poId);
    console.log('Recipient:', recipientEmail);
    console.log('Subject:', subject);
    
    const client = await this.pool.connect();
    try {
      const trackingCode = this.generateTrackingCode();
      console.log('Generated tracking code:', trackingCode);
      
      const result = await client.query(
        `INSERT INTO po_email_tracking 
         (po_id, recipient_email, email_subject, tracking_code, pdf_data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [poId, recipientEmail, subject, trackingCode, pdfData]
      );
      
      console.log('Tracking record created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating tracking record:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get tracking record by tracking code
  async getTrackingRecordByCode(trackingCode) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM po_email_tracking WHERE tracking_code = $1',
        [trackingCode]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Update tracking record status
  async updateTrackingStatus(trackingCode, status, approvalEmail = null) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `UPDATE po_email_tracking 
         SET status = $1, 
             approval_date = CURRENT_TIMESTAMP,
             approval_email = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE tracking_code = $3
         RETURNING *`,
        [status, approvalEmail, trackingCode]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Update PO approval status
  async updatePOApprovalStatus(poId, status, approvalEmail) {
    const client = await this.pool.connect();
    try {
      // If rejecting, set status to 'canceled' (allowed by the constraint)
      // Otherwise use the provided status
      const poStatus = status === 'rejected' ? 'canceled' : status;
      
      const result = await client.query(
        `UPDATE purchase_orders 
         SET status = $1,
             approval_status = $2,
             approval_date = CURRENT_TIMESTAMP,
             approval_email = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE po_id = $4
         RETURNING *`,
        [poStatus, status, approvalEmail, poId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get all tracking records for a PO
  async getPOEmailHistory(poId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM po_email_tracking 
         WHERE po_id = $1 
         ORDER BY sent_date DESC`,
        [poId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Update Rerouting Info
  async updateReroutingInfo(trackingCode, reroutedTo, reroutedTrackingCode) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `UPDATE po_email_tracking 
         SET rerouted_to = $1,
             rerouted_date = CURRENT_TIMESTAMP,
             rerouted_tracking_code = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE tracking_code = $3
         RETURNING *`,
        [reroutedTo, reroutedTrackingCode, trackingCode]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Process email approval
  async processEmailApproval(trackingCode, approvalEmail, isApproved, notes = '') {
    console.log('Starting email approval process...');
    console.log('Tracking code:', trackingCode);
    console.log('Approval email:', approvalEmail);
    console.log('Is approved:', isApproved);
    console.log('Notes:', notes);
    
    let client;
    
    try {
      console.log('Getting database connection...');
      client = await this.pool.connect();
      console.log('Database connection established');
      
      // Begin a transaction
      console.log('Beginning transaction...');
      await client.query('BEGIN');
      console.log('Transaction started');
      
      // Fetch the tracking record
      console.log('Fetching tracking record...');
      const trackingResult = await client.query(
        'SELECT * FROM po_email_tracking WHERE tracking_code = $1',
        [trackingCode]
      );
      
      if (trackingResult.rows.length === 0) {
        console.log('No tracking record found for code:', trackingCode);
        throw new Error('Invalid tracking code');
      }
      
      const trackingRecord = trackingResult.rows[0];
      
      // Verify that the approver is the person the PO was sent to
      if (trackingRecord.recipient_email.toLowerCase() !== approvalEmail.toLowerCase()) {
        console.log('Approval email mismatch!');
        console.log('Expected:', trackingRecord.recipient_email.toLowerCase());
        console.log('Received:', approvalEmail.toLowerCase());
        throw new Error('Unauthorized approval attempt');
      }
      
      // Determine the status for email tracking record
      let emailStatus = 'pending';
      
      // Get the first line of the email for initial status check
      const firstLine = notes.split('\n')[0]?.trim().toLowerCase() || '';
      console.log('First line of email:', firstLine);
      
      // Define approval and hold keywords
      const approvalKeywords = ['approved', 'approval', 'accept', 'accepted', 'yes', 'confirm', 'confirmed', 
                               'looks good', 'i approve', 'approve', 'ok', 'good', 'fine', 'agreed', 'correct'];
      const holdKeywords = ['on hold', 'need changes', 'changes needed', 'need more info', 
                           'more information', 'revise', 'revision needed', 'update needed', 'clarify',
                           'clarification needed', 'modify', 'modification needed', 'incomplete',
                           'not ready', 'wait', 'pending changes', 'fix', 'needs fixing', 'issue', 
                           'problem', 'concern', 'redo', 'adjust', 'edit', 'correction'];
      
      // Check for explicit approval in first line
      const hasApprovalInFirstLine = approvalKeywords.some(keyword => firstLine.includes(keyword));
      const hasHoldInFirstLine = holdKeywords.some(keyword => firstLine.includes(keyword));
      
      console.log('Has approval in first line:', hasApprovalInFirstLine);
      console.log('Has hold in first line:', hasHoldInFirstLine);
      
      // Check for keywords in the full notes
      const hasApprovalInNotes = approvalKeywords.some(keyword => notes.toLowerCase().includes(keyword));
      const hasHoldInNotes = holdKeywords.some(keyword => notes.toLowerCase().includes(keyword));
      
      console.log('Has approval in notes:', hasApprovalInNotes);
      console.log('Has hold in notes:', hasHoldInNotes);
      
      // Decision logic - Prioritize explicit approval in first line
      if (hasApprovalInFirstLine) {
        console.log('Approval detected in first line - Setting to approved');
        emailStatus = 'approved';
      } else if (hasHoldInFirstLine) {
        console.log('Hold detected in first line - Setting to on_hold');
        emailStatus = 'on_hold';
      } else if (hasApprovalInNotes) {
        console.log('Approval detected in notes - Setting to approved');
        emailStatus = 'approved';
      } else if (hasHoldInNotes) {
        console.log('Hold detected in notes - Setting to on_hold');
        emailStatus = 'on_hold';
      } else if (isApproved) {
        console.log('Using isApproved flag - Setting to approved');
        emailStatus = 'approved';
      } else {
        console.log('No clear indication - Setting to rejected');
        emailStatus = 'rejected';
      }
      
      console.log('FINAL EMAIL STATUS:', emailStatus);
      
      // If this is a re-process of an already approved email, don't change status unless explicitly rejected
      if (trackingRecord.status === 'approved' && emailStatus !== 'rejected') {
        console.log('Email was already approved, maintaining approved status');
        emailStatus = 'approved';
      }
      
      // Update the tracking record
      console.log('Updating tracking record with status:', emailStatus);
      await client.query(
        `UPDATE po_email_tracking 
         SET status = $1, 
             approval_date = NOW(), 
             approval_email = $2,
             notes = $3
         WHERE tracking_code = $4`,
        [emailStatus, approvalEmail, notes, trackingCode]
      );
      
      // Get the purchase order ID
      const poId = trackingRecord.po_id;
      
      // Get current purchase order status
      const poResult = await client.query(
        'SELECT status, approval_status FROM purchase_orders WHERE po_id = $1',
        [poId]
      );
      
      if (poResult.rows.length === 0) {
        throw new Error('Purchase order not found');
      }
      
      const currentStatus = poResult.rows[0].status;
      
      // Update the purchase order status accordingly
      console.log('Updating purchase order status...');
      let poStatus = currentStatus;
      let poApprovalStatus = emailStatus;
      
      // Determine the new PO status based on approval status
      if (emailStatus === 'approved') {
        poStatus = 'approved';
        poApprovalStatus = 'approved';
        console.log('Setting PO status to approved - Current status:', currentStatus);
      } else if (emailStatus === 'on_hold') {
        poStatus = 'pending';
        poApprovalStatus = 'on_hold';
        console.log('Setting PO status to pending - Current status:', currentStatus);
      } else {
        poStatus = 'canceled';
        poApprovalStatus = 'rejected';
        console.log('Setting PO status to canceled - Current status:', currentStatus);
      }
      
      // Update both status and approval_status
      console.log(`Setting PO status to '${poStatus}' and approval_status to '${poApprovalStatus}'`);
      const updateResult = await client.query(
        `UPDATE purchase_orders 
         SET status = $1, 
             approval_status = $2,
             approval_date = NOW(), 
             approved_by = $3,
             notes = COALESCE($4, notes)
         WHERE po_id = $5
         RETURNING status, approval_status`,
        [poStatus, poApprovalStatus, approvalEmail, notes, poId]
      );
      
      console.log('PO update result:', updateResult.rows[0]);

      // If approved, re-route to the configured email address
      if (emailStatus === 'approved') {
        const rerouteEmail = process.env.REROUTE_EMAIL;
        if (rerouteEmail) {
          console.log(`PO approved, initiating re-routing to ${rerouteEmail}`);
          const emailService = require('./emailService');
          try {
            const rerouteResult = await emailService.reRouteApprovedPO(poId, rerouteEmail, trackingCode);
            console.log('Re-routing result:', rerouteResult);
          } catch (rerouteError) {
            console.error('Error during re-routing:', rerouteError);
            console.error('Re-routing error details:', rerouteError.message);
            console.error('Re-routing error stack:', rerouteError.stack);
            // Attempt to extract more error information if available
            if (rerouteError.code) {
              console.error('Email error code:', rerouteError.code);
            }
            if (rerouteError.response) {
              console.error('Email error response:', rerouteError.response);
            }
            // Don't throw here - we want to commit the transaction even if rerouting fails
          }
        } else {
          console.warn('No re-route email configured in environment variables');
        }
      }
      
      // Commit transaction
      console.log('Committing transaction...');
      await client.query('COMMIT');
      
      // Emit a socket event to notify clients
      if (socketIo) {
        console.log('Emitting socket event for email status update');
        // Emit two events to ensure clients receive the update
        socketIo.emit('email_status_update', {
          po_id: poId,
          status: poApprovalStatus,
          trackingCode: trackingCode,
          notes: notes
        });
        
        // Also emit a broader PO update event to refresh the UI
        socketIo.emit('purchase_order_update', {
          po_id: poId,
          status: poStatus,
          approval_status: poApprovalStatus
        });
      } else {
        console.warn('Socket.IO instance not available - could not emit status update event');
      }
      
      return {
        success: true,
        poId,
        newStatus: poStatus,
        approvalStatus: poApprovalStatus
      };
    } catch (error) {
      console.error('Error in processEmailApproval:', error);
      
      if (client) {
        // Rollback transaction on error
        console.log('Rolling back transaction...');
        await client.query('ROLLBACK');
        console.log('Transaction rolled back');
      }
      
      throw error;
    } finally {
      if (client) {
        // Release the client back to the pool
        console.log('Releasing database connection...');
        client.release();
        console.log('Database connection released');
      }
    }
  }

  async storeFailedEmailAttempt(emailData) {
    try {
      const result = await this.pool.query(
        `INSERT INTO failed_email_attempts 
        (recipient, subject, html_content, pdf_data, po_id, po_number, error_message, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id`,
        [
          emailData.recipient,
          emailData.subject,
          emailData.html,
          emailData.pdfBase64,
          emailData.poId,
          emailData.poNumber,
          emailData.errorMessage
        ]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error storing failed email attempt:', error);
      throw error;
    }
  }

  async getFailedEmailAttempts() {
    try {
      const result = await this.pool.query(
        `SELECT * FROM failed_email_attempts 
        WHERE status = 'pending' 
        ORDER BY created_at ASC`
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting failed email attempts:', error);
      throw error;
    }
  }

  async markEmailAttemptAsProcessed(id, success) {
    try {
      await this.pool.query(
        `UPDATE failed_email_attempts 
        SET status = $1, processed_at = NOW() 
        WHERE id = $2`,
        [success ? 'sent' : 'failed', id]
      );
    } catch (error) {
      console.error('Error marking email attempt as processed:', error);
      throw error;
    }
  }
}

module.exports = new EmailTrackingService(); 