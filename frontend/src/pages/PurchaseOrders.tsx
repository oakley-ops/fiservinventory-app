import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PurchaseOrderList from '../components/purchaseOrders/PurchaseOrderList';
import PurchaseOrderDetail from '../components/purchaseOrders/PurchaseOrderDetail';
import GeneratePurchaseOrders from '../components/purchaseOrders/GeneratePurchaseOrders';
import ManualPOForm from '../components/purchaseOrders/ManualPOForm';
import SupplierManagement from '../components/suppliers/SupplierManagement';
import SupplierPartsList from '../components/suppliers/SupplierPartsList';
import { Add as AddIcon } from '@mui/icons-material';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const PurchaseOrders: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="purchase-orders-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Purchase Orders</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/purchase-orders/create')}
          >
            Generate PO
          </Button>
        </Box>
      </Box>

      <Routes>
        <Route path="/" element={<PurchaseOrderList />} />
        <Route path="/detail/:id" element={<PurchaseOrderDetail />} />
        <Route path="/create" element={<GeneratePurchaseOrders />} />
        <Route path="/create-manual" element={<ManualPOForm />} />
        <Route path="/suppliers" element={<SupplierManagement />} />
        <Route path="/suppliers/:id/parts" element={<SupplierPartsList />} />
        <Route path="*" element={<Navigate to="/purchase-orders" replace />} />
      </Routes>
    </div>
  );
};

export default PurchaseOrders;
