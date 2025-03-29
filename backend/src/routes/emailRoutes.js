const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const emailTrackingService = require('../services/emailTrackingService');
const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route POST /api/v1/email/send-email
 * @desc Send a purchase order PDF via email
 * @access Private
 */
router.post('/send-email', async (req, res) => {
  try {
    const { pdfBase64, recipient, poNumber, poId } = req.body;

    // Validate required data
    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF data is required' });
    }

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    if (!poNumber) {
      return res.status(400).json({ error: 'Purchase order number is required' });
    }

    if (!poId) {
      return res.status(400).json({ error: 'Purchase order ID is required' });
    }

    // Send the email
    await emailService.sendPurchaseOrderPDF(recipient, poNumber, pdfBase64, poId);

    // Log the activity
    console.log(`Purchase order #${poNumber} sent via email to ${recipient}`);

    // Return success
    return res.status(200).json({ 
      success: true, 
      message: 'Purchase order PDF sent successfully',
      details: {
        recipient,
        poNumber,
        poId
      }
    });

  } catch (error) {
    console.error('Error sending purchase order email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email', 
      details: error.message 
    });
  }
});

/**
 * @route POST /api/v1/email/process-approval
 * @desc Process email approval/rejection
 * @access Private
 */
router.post('/process-approval', async (req, res) => {
  try {
    const { trackingCode, approvalEmail, action } = req.body;

    // Validate required data
    if (!trackingCode) {
      return res.status(400).json({ error: 'Tracking code is required' });
    }

    if (!approvalEmail) {
      return res.status(400).json({ error: 'Approval email is required' });
    }

    if (!action || !['approved', 'rejected'].includes(action.toLowerCase())) {
      return res.status(400).json({ error: 'Invalid action. Must be "approved" or "rejected"' });
    }

    // Process the approval
    const result = await emailTrackingService.processEmailApproval(
      trackingCode,
      approvalEmail,
      action.toLowerCase() === 'approved'
    );

    return res.status(200).json({
      success: true,
      message: `Purchase order ${action} successfully`,
      details: result
    });

  } catch (error) {
    console.error('Error processing email approval:', error);
    return res.status(500).json({
      error: 'Failed to process approval',
      details: error.message
    });
  }
});

/**
 * @route GET /api/v1/email/history/:poId
 * @desc Get email history for a purchase order
 * @access Private
 */
router.get('/history/:poId', async (req, res) => {
  try {
    const { poId } = req.params;

    // Set cache control headers to prevent caching
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // Get email history
    const history = await emailTrackingService.getPOEmailHistory(poId);

    return res.status(200).json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching email history:', error);
    return res.status(500).json({
      error: 'Failed to fetch email history',
      details: error.message
    });
  }
});

// Add a route for manual email approval processing
router.post('/manual-approval', async (req, res) => {
  try {
    const { trackingCode, approverEmail, isApproved } = req.body;
    
    if (!trackingCode || !approverEmail) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tracking code and approver email are required' 
      });
    }
    
    // Process the approval
    const result = await emailTrackingService.processEmailApproval(
      trackingCode,
      approverEmail,
      isApproved !== false // Default to approval if not explicitly set to false
    );
    
    res.json({ 
      success: true, 
      message: `Purchase order ${isApproved !== false ? 'approved' : 'rejected'} successfully`,
      result
    });
  } catch (error) {
    console.error('Error processing manual approval:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint for email functionality
router.get('/test-email', async (req, res) => {
  try {
    const emailService = new EmailService();
    const recipient = req.query.email || process.env.NOTIFICATION_RECIPIENTS.split(',')[0];
    
    console.log(`Testing email functionality to: ${recipient}`);
    
    const result = await emailService.sendEmail(
      'Email System Test', 
      `<h1>Test Email</h1>
       <p>This is a test email to verify the email system functionality.</p>
       <p>If you received this email, the system is working correctly.</p>
       <p>Sent at: ${new Date().toLocaleString()}</p>`,
      recipient
    );
    
    res.json({
      success: true,
      message: 'Test email sent successfully',
      details: {
        recipient,
        messageId: result.messageId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message,
      errorCode: error.code || 'UNKNOWN',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Route to send a purchase order email with PDF attachment
 */
router.post('/purchase-order', async (req, res) => {
  try {
    const { recipient, poNumber, pdfBase64, poId } = req.body;
    
    if (!recipient || !poNumber || !pdfBase64 || !poId) {
      return res.status(400).json({ error: 'Missing required fields for email' });
    }
    
    // Use the existing email service to send the PO
    await emailService.sendPurchaseOrderPDF(recipient, poNumber, pdfBase64, poId);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending purchase order email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router; 