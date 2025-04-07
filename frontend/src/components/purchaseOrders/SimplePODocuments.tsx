import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Box,
  Alert
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { format } from 'date-fns';
import { purchaseOrdersApi } from '../../services/api';
import { PODocument } from '../../types/documents';
import UploadPODocument from './UploadPODocument';

interface SimplePODocumentsProps {
  poId: number;
}

const SimplePODocuments: React.FC<SimplePODocumentsProps> = ({ poId }) => {
  const [documents, setDocuments] = useState<PODocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState<boolean>(false);

  // Load documents when component mounts
  useEffect(() => {
    fetchDocuments();
  }, [poId]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Fetching documents for PO ID:', poId);

      // Check for real API method
      if (typeof purchaseOrdersApi.getDocumentsByPOId === 'function') {
        const response = await purchaseOrdersApi.getDocumentsByPOId(poId);
        console.log('Documents API response:', response);
        setDocuments(response.data || []);
      } else {
        // Use mock data
        console.log('Using mock document data (API method not available)');
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
        
        // Mock data for testing UI
        const mockDocuments: PODocument[] = [
          {
            document_id: 1,
            po_id: poId,
            file_path: '/mock/path/receipt.pdf',
            file_name: `PO-${poId}-receipt.pdf`,
            document_type: 'receipt',
            created_at: new Date().toISOString(),
            created_by: 'system',
            notes: 'Auto-generated receipt'
          },
          {
            document_id: 2,
            po_id: poId,
            file_path: '/mock/path/invoice.pdf',
            file_name: `PO-${poId}-invoice.pdf`,
            document_type: 'invoice',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            created_by: 'user1',
            notes: 'Uploaded invoice from supplier'
          }
        ];
        
        setDocuments(mockDocuments);
      }
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      
      // Special handling for 404 (no documents yet)
      if (err.response && err.response.status === 404) {
        console.log('No documents found for this PO (404 response)');
        setDocuments([]);
      } else {
        setError(`Failed to load documents: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId: number) => {
    try {
      console.log('Attempting to download document ID:', documentId);
      
      if (typeof purchaseOrdersApi.downloadPODocument === 'function') {
        await purchaseOrdersApi.downloadPODocument(documentId);
      } else {
        // Mock download for testing
        console.log('Mock document download triggered');
        alert('Mock document download - In production, this would download the actual receipt document.');
      }
    } catch (err: any) {
      console.error('Error downloading document:', err);
      window.alert(`Failed to download document: ${err.message || 'Unknown error'}`);
    }
  };

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
  };

  const handleUploadSuccess = () => {
    // Refresh the documents list after successful upload
    fetchDocuments();
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', padding: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
        <Typography variant="h6">Documents</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<FileUploadIcon />} 
          onClick={handleOpenUploadDialog}
        >
          Upload Document
        </Button>
      </Box>

      {documents.length === 0 ? (
        <Alert severity="info" sx={{ margin: 2 }}>
          No documents available for this purchase order
        </Alert>
      ) : (
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="documents table">
            <TableHead>
              <TableRow>
                <TableCell>File Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.document_id}>
                  <TableCell>{doc.file_name}</TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>
                    {doc.created_at ? format(new Date(doc.created_at), 'MM/dd/yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>{doc.created_by || 'N/A'}</TableCell>
                  <TableCell>{doc.notes || 'N/A'}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="primary" 
                      onClick={() => handleDownload(doc.document_id)}
                      title="Download"
                    >
                      <CloudDownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Upload Document Dialog */}
      <UploadPODocument
        poId={poId}
        open={uploadDialogOpen}
        onClose={handleCloseUploadDialog}
        onSuccess={handleUploadSuccess}
      />
    </Paper>
  );
};

export default SimplePODocuments; 