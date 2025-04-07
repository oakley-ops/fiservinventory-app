const fs = require('fs').promises;
const path = require('path');
const { generatePurchaseOrderPDF } = require('../utils/pdfGenerator');

/**
 * Service for managing purchase order documents
 */
class PODocumentService {
  constructor(pool) {
    this.pool = pool;
    this.documentDir = path.join(process.cwd(), 'uploads', 'po_documents');
  }

  /**
   * Ensure the document directory exists
   */
  async ensureDocumentDirectory() {
    try {
      await fs.access(this.documentDir);
    } catch (error) {
      // Directory doesn't exist, create it
      await fs.mkdir(this.documentDir, { recursive: true });
    }
  }

  /**
   * Generate a receipt document for a purchase order
   * @param {Object} purchaseOrder - The purchase order object
   * @param {string} username - The user generating the document
   * @returns {Promise<Object>} - The created document record
   */
  async generateReceiptDocument(purchaseOrder, username) {
    try {
      // Ensure directory exists
      await this.ensureDocumentDirectory();

      const { po_id, po_number } = purchaseOrder;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `PO-${po_number}-receipt-${timestamp}.pdf`;
      const filePath = path.join(this.documentDir, fileName);

      // Generate PDF
      const pdfBuffer = await generatePurchaseOrderPDF(purchaseOrder, true);
      
      // Write to file
      await fs.writeFile(filePath, pdfBuffer);

      // Save record in database
      const result = await this.pool.query(
        `INSERT INTO purchase_order_documents 
         (po_id, file_path, file_name, document_type, created_by, notes) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [
          po_id,
          filePath,
          fileName,
          'receipt',
          username,
          `Receipt document generated when PO was marked as received on ${new Date().toISOString()}`
        ]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error generating receipt document:', error);
      throw new Error(`Failed to generate receipt document: ${error.message}`);
    }
  }

  /**
   * Get all documents for a purchase order
   * @param {number} poId - The purchase order ID
   * @returns {Promise<Array>} - The documents
   */
  async getDocumentsByPOId(poId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM purchase_order_documents WHERE po_id = $1 ORDER BY created_at DESC',
        [poId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching PO documents:', error);
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
  }

  /**
   * Get a document by ID
   * @param {number} documentId - The document ID
   * @returns {Promise<Object>} - The document
   */
  async getDocumentById(documentId) {
    try {
      const result = await this.pool.query(
        'SELECT * FROM purchase_order_documents WHERE document_id = $1',
        [documentId]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Document not found');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching document:', error);
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  }

  /**
   * Get document file content
   * @param {number} documentId - The document ID
   * @returns {Promise<Buffer>} - The file content
   */
  async getDocumentContent(documentId) {
    try {
      const document = await this.getDocumentById(documentId);
      return await fs.readFile(document.file_path);
    } catch (error) {
      console.error('Error reading document file:', error);
      throw new Error(`Failed to read document file: ${error.message}`);
    }
  }
}

module.exports = PODocumentService; 