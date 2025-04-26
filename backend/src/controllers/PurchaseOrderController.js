const PurchaseOrder = require('../models/PurchaseOrder');
const { pool } = require('../../db');
const { body, validationResult } = require('express-validator');
const { format } = require('date-fns');
const { getClientWithTimeout } = require('../../utils/dbUtils');
const PODocumentService = require('../services/PODocumentService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for file uploads
const documentStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'po_documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Create unique filename based on PO ID, timestamp and original extension
    const poId = req.params.id;
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);
    const filename = `po-${poId}-${timestamp}${fileExt}`;
    cb(null, filename);
  }
});

// File filter to only allow certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, XLS, XLSX, JPG, and PNG are allowed.'), false);
  }
};

const upload = multer({
  storage: documentStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}).single('document');

class PurchaseOrderController {
  constructor() {
    // Use the shared pool instance from db.js instead of creating a new one
    this.pool = pool;
    
    // Initialize the document service
    this.documentService = new PODocumentService(this.pool);
    
    // Bind methods to instance to prevent 'this' context loss
    this.createBlankPurchaseOrder = this.createBlankPurchaseOrder.bind(this);
    this.uploadDocument = this.uploadDocument.bind(this);
    this.getDocumentsByPurchaseOrderId = this.getDocumentsByPurchaseOrderId.bind(this);
    this.downloadDocument = this.downloadDocument.bind(this);
    this.deleteDocument = this.deleteDocument.bind(this);
  }
  
  // ... [other methods remain unchanged]

  /**
   * Get documents for a purchase order
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getDocumentsByPurchaseOrderId(req, res) {
    const { id } = req.params;
    
    try {
      const documents = await this.documentService.getDocumentsByPOId(parseInt(id));
      res.json(documents);
    } catch (error) {
      // Special handling for 'no documents' scenario - return empty array
      if (error.message.includes('no rows')) {
        return res.json([]);
      }
      console.error('Error getting PO documents:', error);
      res.status(500).json({ error: `Failed to get documents: ${error.message}` });
    }
  }

  /**
   * Download a document by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async downloadDocument(req, res) {
    const { documentId } = req.params;
    
    try {
      const document = await this.documentService.getDocumentById(parseInt(documentId));
      const fileContent = await this.documentService.getDocumentContent(parseInt(documentId));
      
      // Set appropriate headers
      res.setHeader('Content-Type', this.getContentType(document.file_name));
      res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
      
      // Send the file
      res.send(fileContent);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ error: `Failed to download document: ${error.message}` });
    }
  }

  /**
   * Delete a document by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async deleteDocument(req, res) {
    const { documentId } = req.params;
    
    try {
      const document = await this.documentService.deleteDocument(parseInt(documentId));
      res.status(200).json({ 
        message: 'Document deleted successfully',
        document_id: document.document_id 
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      
      // Check for specific errors
      if (error.message.includes('Document not found')) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.status(500).json({ error: `Failed to delete document: ${error.message}` });
    }
  }

  /**
   * Handle document uploads
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async uploadDocument(req, res) {
    const { id } = req.params;
    const poId = parseInt(id);
    
    upload(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      try {
        // Get username from authenticated user
        const username = req.user ? req.user.username : 'system';
        
        // Get optional notes from the request body
        const { notes } = req.body;
        
        // Process the uploaded document
        const document = await this.documentService.uploadDocument(
          poId,
          req.file,
          username,
          notes
        );
        
        res.status(201).json(document);
      } catch (error) {
        console.error('Error processing uploaded document:', error);
        res.status(500).json({ error: `Failed to process document: ${error.message}` });
      }
    });
  }

  /**
   * Get content type based on file extension
   * @param {string} filename - The filename
   * @returns {string} - The content type
   */
  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  // ... [all other methods remain unchanged]
}

module.exports = PurchaseOrderController;