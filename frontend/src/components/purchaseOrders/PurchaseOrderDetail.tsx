import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  TextField,
  InputAdornment
} from '@mui/material';
import { format } from 'date-fns';
import { purchaseOrdersApi } from '../../services/api';
import { PurchaseOrder } from '../../types/purchaseOrder';
import PrintIcon from '@mui/icons-material/Print';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NoteIcon from '@mui/icons-material/Note';
import { generatePurchaseOrderPDF } from '../../utils/pdfTemplates';

const PurchaseOrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [nextDayAir, setNextDayAir] = useState<boolean>(false);
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [isEditingShipping, setIsEditingShipping] = useState<boolean>(false);
  const [isEditingTax, setIsEditingTax] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await purchaseOrdersApi.getById(parseInt(id));
        console.log('Purchase order data from API:', response.data);
        
        // Enhanced logging for debugging
        console.log('Purchase order structure:', JSON.stringify(response.data, null, 2));
        console.log('Supplier address check:', 
          response.data.supplier_address || 
          response.data.vendor_address || 
          response.data.address);
        
        // Create a normalized version of the purchase order with consistent field names
        const normalizedPO = {
          ...response.data,
          // Ensure we have consistent field names for address, email, phone
          supplier_address: response.data.supplier_address || response.data.address || '',
          supplier_email: response.data.supplier_email || response.data.email || '',
          supplier_phone: response.data.supplier_phone || response.data.phone || '',
          contact_name: response.data.contact_name || '',
          is_urgent: response.data.is_urgent || response.data.priority === 'urgent' || false,
          next_day_air: response.data.next_day_air || false
        };
        
        // Log each item in the purchase order
        if (response.data.items && response.data.items.length > 0) {
          console.log(`Found ${response.data.items.length} items in purchase order:`);
          response.data.items.forEach((item: any, index: number) => {
            console.log(`Item ${index + 1}:`, JSON.stringify(item, null, 2));
          });
        } else {
          console.warn('No items found in purchase order');
        }
        
        setPurchaseOrder(normalizedPO);
        setStatus(normalizedPO.status || 'pending');
        setIsUrgent(normalizedPO.is_urgent || false);
        setNextDayAir(normalizedPO.next_day_air || false);
        setShippingCost(normalizedPO.shipping_cost || 0);
        setTaxAmount(normalizedPO.tax_amount || 0);
        setError(null);
      } catch (error) {
        console.error('Error fetching purchase order:', error);
        setError('Failed to load purchase order. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseOrder();
  }, [id]);

  const handleStatusChange = async (event: React.ChangeEvent<{ value: unknown }>) => {
    const newStatus = event.target.value as string;
    
    if (!id || !purchaseOrder) return;
    
    try {
      setStatusUpdating(true);
      await purchaseOrdersApi.updateStatus(parseInt(id), newStatus);
      
      // Update local state
      setStatus(newStatus);
      setPurchaseOrder({
        ...purchaseOrder,
        status: newStatus as any
      });
      
    } catch (error) {
      console.error('Error updating status:', error);
      setError('Failed to update purchase order status. Please try again later.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handlePriorityChange = async (urgent: boolean) => {
    if (!id || !purchaseOrder) return;
    
    try {
      setIsUpdating(true);
      
      // Create a priority update object
      const updateData = {
        po_id: parseInt(id),
        is_urgent: urgent,
        priority: urgent ? 'urgent' : 'normal'
      };
      
      // API call to update priority
      await purchaseOrdersApi.update(parseInt(id), updateData);
      
      // Update local state
      setIsUrgent(urgent);
      setPurchaseOrder({
        ...purchaseOrder,
        is_urgent: urgent,
        priority: urgent ? 'urgent' : 'normal'
      });
      
      console.log(`Priority updated to: ${urgent ? 'Urgent' : 'Not Urgent'}`);
      
    } catch (error) {
      console.error('Error updating priority:', error);
      setError('Failed to update purchase order priority. Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleShippingChange = async (nextDay: boolean) => {
    if (!id || !purchaseOrder) return;
    
    try {
      setIsUpdating(true);
      
      // Create a shipping update object
      const updateData = {
        po_id: parseInt(id),
        next_day_air: nextDay
      };
      
      // API call to update shipping method
      await purchaseOrdersApi.update(parseInt(id), updateData);
      
      // Update local state
      setNextDayAir(nextDay);
      setPurchaseOrder({
        ...purchaseOrder,
        next_day_air: nextDay
      });
      
      console.log(`Shipping method updated to: ${nextDay ? 'Next Day Air' : 'Regular Shipping'}`);
      
    } catch (error) {
      console.error('Error updating shipping method:', error);
      setError('Failed to update shipping method. Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShippingCostChange = async (value: number) => {
    if (!id || !purchaseOrder) return;
    
    try {
      setIsUpdating(true);
      
      // Create a shipping cost update object
      const updateData = {
        shipping_cost: value
      };
      
      // API call to update shipping cost
      await purchaseOrdersApi.update(parseInt(id), updateData);
      
      // Update local state
      setShippingCost(value);
      setPurchaseOrder({
        ...purchaseOrder,
        shipping_cost: value
      });
      
      console.log('Shipping cost updated successfully');
    } catch (error) {
      console.error('Error updating shipping cost:', error);
      setError('Failed to update shipping cost. Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleTaxAmountChange = async (value: number) => {
    if (!id || !purchaseOrder) return;
    
    try {
      setIsUpdating(true);
      
      // Create a tax amount update object
      const updateData = {
        tax_amount: value
      };
      
      // API call to update tax amount
      await purchaseOrdersApi.update(parseInt(id), updateData);
      
      // Update local state
      setTaxAmount(value);
      setPurchaseOrder({
        ...purchaseOrder,
        tax_amount: value
      });
      
      console.log('Tax amount updated successfully');
    } catch (error) {
      console.error('Error updating tax amount:', error);
      setError('Failed to update tax amount. Please try again later.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportToPDF = async () => {
    if (!purchaseOrder) return;
    
    try {
      setLoading(true);
      console.log('Exporting purchase order to PDF - Full data:', JSON.stringify(purchaseOrder, null, 2));
      
      // Generate PDF with purchase order data
      await generatePurchaseOrderPDF(purchaseOrder);
      
    } catch (error) {
      console.error('Error generating PDF file:', error);
      setError('Failed to generate PDF. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'submitted':
        return 'info';
      case 'approved':
        return 'success';
      case 'received':
        return 'success';
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={5}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!purchaseOrder) {
    return <Alert severity="warning">Purchase order not found</Alert>;
  }

  return (
    <Box className="purchase-order-detail" mb={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/purchase-orders')}
          variant="outlined"
        >
          Back to Purchase Orders
        </Button>
        <Box>
          <Button
            startIcon={<PictureAsPdfIcon />}
            onClick={handleExportToPDF}
            variant="contained"
            color="primary"
            sx={{ mr: 2 }}
          >
            Export to PDF
          </Button>
          <Button
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            variant="contained"
            sx={{ mr: 2 }}
          >
            Print Purchase Order
          </Button>
        </Box>
      </Box>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">Purchase Order #{purchaseOrder.po_number}</Typography>
          <Box>
            <FormControl variant="outlined" size="small" sx={{ minWidth: 150, mr: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={handleStatusChange as any}
                label="Status"
                disabled={statusUpdating}
              >
                <MenuItem value="pending">PENDING</MenuItem>
                <MenuItem value="submitted">SUBMITTED</MenuItem>
                <MenuItem value="approved">APPROVED</MenuItem>
                <MenuItem value="received">RECEIVED</MenuItem>
                <MenuItem value="canceled">CANCELED</MenuItem>
              </Select>
            </FormControl>
            <Chip
              label={status.toUpperCase()}
              color={getStatusColor(status)}
            />
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Supplier Information
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {purchaseOrder.supplier_name || purchaseOrder.vendor_name || 'No Supplier Name'}
                  </Typography>
                </Box>
                
                {(purchaseOrder.contact_name) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }}/>
                    <Typography variant="body2">Contact: {purchaseOrder.contact_name}</Typography>
                  </Box>
                )}
                
                {(purchaseOrder.supplier_address) && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <LocationOnIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'primary.main' }}/>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: 'pre-line', 
                        wordBreak: 'break-word'
                      }}
                    >
                      {purchaseOrder.supplier_address}
                    </Typography>
                  </Box>
                )}
                
                {(purchaseOrder.supplier_email) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }}/>
                    <Typography variant="body2">
                      {purchaseOrder.supplier_email}
                    </Typography>
                  </Box>
                )}
                
                {(purchaseOrder.supplier_phone) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'primary.main' }}/>
                    <Typography variant="body2">
                      {purchaseOrder.supplier_phone}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Order Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>PO Number:</strong> {purchaseOrder.po_number}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Date Created:</strong> {purchaseOrder.created_at ? format(new Date(purchaseOrder.created_at), 'MM/dd/yyyy') : 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Date Updated:</strong> {purchaseOrder.updated_at ? format(new Date(purchaseOrder.updated_at), 'MM/dd/yyyy') : 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Status:</strong> {purchaseOrder.status?.toUpperCase() || 'PENDING'}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Total Amount:</strong> ${typeof purchaseOrder.total_amount === 'number' ? 
                    purchaseOrder.total_amount.toFixed(2) : 
                    parseFloat(purchaseOrder.total_amount || '0').toFixed(2)}
                </Typography>

                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Shipping Options
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Priority:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant={isUrgent ? "contained" : "outlined"}
                        color="error"
                        size="small"
                        onClick={() => handlePriorityChange(true)}
                        disabled={isUpdating || isUrgent}
                      >
                        Urgent
                      </Button>
                      <Button
                        variant={!isUrgent ? "contained" : "outlined"}
                        color="primary"
                        size="small"
                        onClick={() => handlePriorityChange(false)}
                        disabled={isUpdating || !isUrgent}
                      >
                        Not Urgent
                      </Button>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Shipping Method:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant={nextDayAir ? "contained" : "outlined"}
                        color="secondary"
                        size="small"
                        onClick={() => handleShippingChange(true)}
                        disabled={isUpdating || nextDayAir}
                      >
                        Next Day Air
                      </Button>
                      <Button
                        variant={!nextDayAir ? "contained" : "outlined"}
                        color="primary"
                        size="small"
                        onClick={() => handleShippingChange(false)}
                        disabled={isUpdating || !nextDayAir}
                      >
                        Regular Shipping
                      </Button>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Shipping Cost:</strong>
                    </Typography>
                    <TextField
                      label=""
                      type="number"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      style={{ width: '200px' }}
                      value={isEditingShipping && shippingCost === 0 ? '' : shippingCost}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setShippingCost(isNaN(value) ? 0 : value);
                      }}
                      onFocus={() => setIsEditingShipping(true)}
                      onBlur={() => {
                        setIsEditingShipping(false);
                        handleShippingCostChange(shippingCost);
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      <strong>Tax Amount:</strong>
                    </Typography>
                    <TextField
                      label=""
                      type="number"
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      style={{ width: '200px' }}
                      value={isEditingTax && taxAmount === 0 ? '' : taxAmount}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setTaxAmount(isNaN(value) ? 0 : value);
                      }}
                      onFocus={() => setIsEditingTax(true)}
                      onBlur={() => {
                        setIsEditingTax(false);
                        handleTaxAmountChange(taxAmount);
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {purchaseOrder.notes && (
          <Box mt={2}>
            <Card variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <NoteIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'primary.main' }}/>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">Notes</Typography>
                    <Typography variant="body2">{purchaseOrder.notes}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        )}
      </Paper>

      <Typography variant="h6" gutterBottom>Order Items</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Part Name</TableCell>
              <TableCell>Part #</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Unit Price</TableCell>
              <TableCell>Total Price</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseOrder.items?.map((item) => (
              <TableRow key={item.item_id}>
                <TableCell>{item.part_name}</TableCell>
                <TableCell>
                  {item.manufacturer_part_number || item.fiserv_part_number || '-'}
                </TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>${typeof item.unit_price === 'number' ? 
                  item.unit_price.toFixed(2) : 
                  parseFloat(item.unit_price || '0').toFixed(2)}</TableCell>
                <TableCell>${typeof item.total_price === 'number' ? 
                  item.total_price.toFixed(2) : 
                  parseFloat(item.total_price || '0').toFixed(2)}</TableCell>
                <TableCell>{item.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={3} display="flex" justifyContent="flex-end">
        <Typography variant="h6">
          Total: ${typeof purchaseOrder.total_amount === 'number' ? 
            purchaseOrder.total_amount.toFixed(2) : 
            parseFloat(purchaseOrder.total_amount || '0').toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );
};

export default PurchaseOrderDetail;
