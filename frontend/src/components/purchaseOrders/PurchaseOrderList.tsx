import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Button, 
  Chip, 
  Box, 
  Typography, 
  CircularProgress,
  IconButton,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { purchaseOrdersApi } from '../../services/api';
import { PurchaseOrder } from '../../types/purchaseOrder';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { format } from 'date-fns';

const PurchaseOrderList: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  // Add a derived state to check for pending POs
  const pendingPOsExist = purchaseOrders.some(po => 
    po.status === 'pending' || po.status === 'submitted'
  );

  useEffect(() => {
    const fetchPurchaseOrders = async () => {
      try {
        setLoading(true);
        console.log('Fetching purchase orders...');
        const response = await purchaseOrdersApi.getAll();
        console.log('Purchase orders response:', response);
        setPurchaseOrders(response.data || []);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching purchase orders:', error);
        // More detailed error information
        const errorMessage = error.response ? 
          `Error ${error.response.status}: ${error.response.data}` : 
          error.message || 'Failed to load purchase orders';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrders();
  }, []);

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'submitted':
        return 'info';
      case 'approved':
        return 'success';
      case 'on_hold':
        return 'info';
      case 'rejected':
        return 'error';
      case 'received':
        return 'success';
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  const handleDelete = async (id: number | undefined) => {
    if (!id) {
      console.error('No PO ID provided for deletion');
      return;
    }
    
    console.log('Attempting to delete PO:', id);
    
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        setIsLoading(true);
        console.log('Making delete request to API...');
        
        // First attempt with increased timeout
        try {
          const response = await purchaseOrdersApi.delete(id);
          console.log('Delete response:', response);
          setPurchaseOrders(purchaseOrders.filter(po => po.po_id !== id));
          setSnackbarMessage('Purchase order deleted successfully');
          setSnackbarSeverity('success');
          setSnackbarOpen(true);
          return;
        } catch (error: any) {
          console.error('First delete attempt failed:', error);
          
          // If it's not a timeout error, rethrow
          if (!error.message?.includes('timed out')) {
            throw error;
          }
          
          // If we got a timeout, wait 2 seconds and verify if the PO still exists
          console.log('Delete timed out, verifying PO existence...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          try {
            // Try to fetch the PO
            const verifyResponse = await purchaseOrdersApi.getById(id);
            console.log('PO still exists after timeout:', verifyResponse);
            // If we get here, the PO still exists, so throw the original error
            throw error;
          } catch (verifyError: any) {
            console.log('Verification error:', verifyError);
            if (verifyError.response?.status === 404) {
              // PO doesn't exist anymore, so the delete was actually successful
              setPurchaseOrders(purchaseOrders.filter(po => po.po_id !== id));
              setSnackbarMessage('Purchase order deleted successfully');
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
              return;
            }
            throw error; // Re-throw the original error
          }
        }
      } catch (error: any) {
        console.error('Error deleting purchase order:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response,
          status: error.response?.status,
          data: error.response?.data
        });
        
        let errorMessage = 'Failed to delete purchase order. Please try again later.';
        
        if (error.response?.status === 404) {
          errorMessage = 'Purchase order not found.';
        } else if (error.response?.status === 400) {
          errorMessage = error.response.data.message || 'Cannot delete this purchase order.';
        } else if (error.message.includes('timed out')) {
          errorMessage = 'Operation timed out. The purchase order may have been deleted. Please refresh the page.';
        }
        
        setError(errorMessage);
        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleExportAllToExcel = () => {
    if (purchaseOrders.length === 0) return;

    // Format header row
    const headers = [
      'PO Number', 
      'Supplier', 
      'Status',
      'Created Date', 
      'Total Amount',
      'Updated Date'
    ];
    
    // Format purchase orders data
    const poData = purchaseOrders.map(po => [
      po.po_number,
      po.supplier_name || po.vendor_name || 'N/A',
      po.status?.toUpperCase() || 'PENDING',
      po.created_at ? format(new Date(po.created_at), 'MM/dd/yyyy') : 'N/A',
      typeof po.total_amount === 'number' ? 
        po.total_amount.toFixed(2) : 
        Number(po.total_amount || 0).toFixed(2),
      po.updated_at ? format(new Date(po.updated_at), 'MM/dd/yyyy') : 'N/A'
    ]);
    
    // Combine all rows
    const csvRows = [
      headers,
      ...poData
    ];
    
    // Create CSV content
    const csvContent = csvRows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `All_Purchase_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <Box 
        sx={{ 
          display: 'flex',
          justifyContent: 'flex-start',
          gap: 2,
          mb: 3,
          mt: 2
        }}
      >
        <Button 
          variant="outlined" 
          onClick={() => navigate('/purchase-orders/suppliers')}
          sx={{ 
            height: '38px',
            borderColor: '#0288d1',
            color: '#0288d1',
            '&:hover': {
              borderColor: '#01579b',
              backgroundColor: 'rgba(2, 136, 209, 0.04)'
            }
          }}
        >
          Manage Suppliers
        </Button>
        <Button 
          variant="contained" 
          onClick={() => navigate('/purchase-orders/create-manual')}
          sx={{ 
            height: '38px',
            backgroundColor: '#ff6200', // Fiserv orange
            color: 'white',
            '&:hover': {
              backgroundColor: '#e55a00'
            }
          }}
        >
          Create Manual PO
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportAllToExcel}
          disabled={purchaseOrders.length === 0}
          sx={{ 
            height: '38px',
            backgroundColor: '#2e7d32',
            '&:hover': {
              backgroundColor: '#1b5e20'
            }
          }}
        >
          Export All
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={5}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading purchase orders...</Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : purchaseOrders.length === 0 ? (
        <Box textAlign="center" mt={5}>
          <Typography variant="body1" mb={2}>
            No purchase orders found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Use the "Generate PO" button for automatic purchase orders or "Create Manual PO" to enter purchase order details manually.
          </Typography>
        </Box>
      ) : (
        <TableContainer 
          component={Paper} 
          sx={{ 
            boxShadow: 'none', 
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Supplier</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Amount</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchaseOrders.map((po) => (
                <TableRow key={po.po_id}>
                  <TableCell>{po.po_number}</TableCell>
                  <TableCell>{po.supplier_name || po.vendor_name || 'N/A'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={po.status || 'pending'} 
                      color={getStatusColor(po.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    ${typeof po.total_amount === 'number' ? po.total_amount.toFixed(2) : Number(po.total_amount || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {po.created_at ? new Date(po.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => navigate(`/purchase-orders/detail/${po.po_id}`)}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      color="error" 
                      onClick={() => handleDelete(po.po_id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
};

export default PurchaseOrderList;
