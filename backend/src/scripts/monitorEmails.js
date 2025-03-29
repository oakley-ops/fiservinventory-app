// Load environment variables first
require('dotenv').config();

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const emailTrackingService = require('../services/emailTrackingService');

// Verify environment variables are loaded
console.log('Environment variables loaded:', {
  DB_USER: process.env.DB_USER,
  DB_HOST: process.env.DB_HOST,
  DB_PORT: process.env.DB_PORT,
  DB_NAME: process.env.DB_NAME,
  IMAP_USER: process.env.IMAP_USER,
  IMAP_HOST: process.env.IMAP_HOST,
  IMAP_PORT: process.env.IMAP_PORT,
  IMAP_SECURE: process.env.IMAP_SECURE
});

class EmailMonitor {
  constructor() {
    console.log('Initializing EmailMonitor with IMAP config:', {
      user: process.env.IMAP_USER,
      host: process.env.IMAP_HOST,
      port: process.env.IMAP_PORT,
      secure: process.env.IMAP_SECURE === 'true'
    });

    this.imap = new Imap({
      user: process.env.IMAP_USER,
      password: process.env.IMAP_PASSWORD,
      host: process.env.IMAP_HOST,
      port: process.env.IMAP_PORT,
      tls: process.env.IMAP_SECURE === 'true',
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 30000,
      connTimeout: 30000,
      debug: (msg) => console.log('IMAP Debug:', msg)
    });

    // Keep track of the polling interval
    this.pollingInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.imap.once('ready', () => {
      console.log('Successfully connected to email server');
      this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
      this.startMonitoring();
    });

    this.imap.once('error', (err) => {
      console.error('IMAP connection error:', err);
      this.handleConnectionError();
    });

    this.imap.once('end', () => {
      console.log('IMAP connection ended');
      this.handleConnectionError();
    });
  }

  handleConnectionError() {
    // Clear any existing intervals
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    this.reconnectAttempts++;
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Attempting to reconnect (attempt ${this.reconnectAttempts} of ${this.maxReconnectAttempts}) in ${delay/1000} seconds...`);
      setTimeout(() => {
        console.log('Reconnecting...');
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached. Please check the email configuration and restart the service.');
      process.exit(1); // Exit so PM2 can restart the process
    }
  }

  setupPolling() {
    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Check for new emails every 30 seconds
    this.pollingInterval = setInterval(() => {
      console.log('Polling for approval emails...');
      this.checkForApprovalEmails();
    }, 30000);

    // Initial check
    this.checkForApprovalEmails();
  }

  checkForApprovalEmails() {
    if (this.imap.state !== 'authenticated') {
      console.log('Not authenticated, attempting to reconnect...');
      this.connect();
      return;
    }
    
    console.log('Checking for approval emails...');
    
    // Search for ALL messages with PO approval subjects
    const searchCriteria = [['OR', ['SUBJECT', 'PO-APPROVAL-'], ['SUBJECT', 'Re: PO-APPROVAL-']]];
    
    this.imap.search(searchCriteria, (err, results) => {
      if (err) {
        console.error('Error searching messages:', err);
        return;
      }

      if (!results || !results.length) {
        console.log('No approval messages found - this is normal');
        return;
      }

      console.log('Found', results.length, 'approval messages to process');

      // Process each message
      const f = this.imap.fetch(results, {
        bodies: '',
        struct: true,
        markSeen: true
      });

      let processedCount = 0;
      f.on('message', (msg) => {
        console.log('Processing new message...');
        msg.on('body', (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              console.error('Error parsing message:', err);
              return;
            }

            try {
              // Extract tracking code from subject, handling RE: prefix
              const cleanSubject = parsed.subject.replace(/^RE:\s*/i, '').replace(/^Re:\s*/i, '');
              const trackingCodeMatch = cleanSubject.match(/\[PO-APPROVAL-([^\]]+)\]/);
              if (!trackingCodeMatch) {
                console.log('No tracking code found in subject:', cleanSubject);
                return;
              }

              const trackingCode = trackingCodeMatch[1];
              console.log('Processing email with tracking code:', trackingCode);
              
              // Extract just the email address from the from field
              let approvalEmail = parsed.from.text;
              if (approvalEmail.includes('<') && approvalEmail.includes('>')) {
                approvalEmail = approvalEmail.match(/<([^>]+)>/)[1];
              }
              
              console.log('Processing approval from:', approvalEmail);
              console.log('Email content:', parsed.text);
              
              // Check for approval/hold keywords in the subject or body
              const subjectLower = cleanSubject.toLowerCase();
              const bodyLower = parsed.text?.toLowerCase() || '';
              const bodyLines = parsed.text?.split('\n').map(line => line.trim().toLowerCase()) || [];
              
              // Define approval and hold keywords
              const approvalKeywords = ['approved', 'approval', 'accept', 'accepted', 'yes', 'confirm', 'confirmed', 
                                     'looks good', 'i approve', 'approve', 'ok', 'good', 'fine', 'agreed', 'correct'];
              
              // Simplified approval check - if any line starts with an approval keyword
              const hasApproval = bodyLines.some(line => 
                approvalKeywords.some(keyword => line.startsWith(keyword))
              );

              // If we find an approval keyword, mark as approved
              const isApproved = hasApproval;
              console.log('Approval status:', isApproved ? 'APPROVED' : 'NOT APPROVED');
              
              try {
                await emailTrackingService.processEmailApproval(trackingCode, approvalEmail, isApproved, parsed.text);
                console.log(`Successfully processed email for tracking code ${trackingCode}`);
                processedCount++;
              } catch (error) {
                console.error('Error processing email approval:', error);
                console.error('Error details:', error.message);
                console.error('Stack trace:', error.stack);
              }
            } catch (error) {
              console.error('Error processing email:', error);
            }
          });
        });
      });

      f.once('error', (err) => {
        if (err.message === 'Nothing to fetch') {
          console.log('No messages to fetch - this is normal');
        } else {
          console.error('Fetch error:', err);
        }
      });

      f.once('end', () => {
        console.log(`Finished processing ${processedCount} messages`);
      });
    });
  }

  startMonitoring() {
    // Open the inbox
    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        this.handleConnectionError();
        return;
      }

      console.log('Opened inbox:', box.messages.total, 'messages');
      this.setupPolling();
      
      // Set up a listener for new messages
      this.imap.on('mail', (numNewMsgs) => {
        console.log(`Received ${numNewMsgs} new messages - checking for approvals`);
        this.checkForApprovalEmails();
      });
    });
  }

  connect() {
    try {
      this.imap.connect();
    } catch (error) {
      console.error('Error connecting to IMAP server:', error);
      this.handleConnectionError();
    }
  }
}

// Start the email monitor
const monitor = new EmailMonitor();
monitor.connect();

// Set up error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  // Let PM2 restart the process
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Let PM2 restart the process
  process.exit(1);
}); 