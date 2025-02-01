// src/components/RemovePartForm.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { fetchParts } from '../store/partsSlice';
import BarcodeScanner from './BarcodeScanner'; // Import the BarcodeScanner component

const RemovePartForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [barcode, setBarcode] = useState('');
  const [quantityToRemove, setQuantityToRemove] = useState(1); // Default to removing 1 item

  const handleBarcodeScanned = (scannedBarcode: string) => {
    setBarcode(scannedBarcode);
  };

  const handleQuantityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuantityToRemove(parseInt(event.target.value));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!barcode) {
      alert('Please scan a barcode first.');
      return;
    }

    try {
      // Assuming you have an API endpoint to remove parts by barcode
      await axios.post('/api/v1/parts/remove', { 
        barcode, 
        quantity: quantityToRemove 
      });
      dispatch(fetchParts());
      setBarcode('');
      setQuantityToRemove(1); // Reset quantity
      alert('Part removed from inventory.');
    } catch (error: any) {
      console.error('Error removing part:', error);
      alert(error.response?.data?.message || 'Failed to remove part.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Remove Part</h2>
      <BarcodeScanner onScan={handleBarcodeScanned} />
      {barcode && (
        <div>
          <p>Scanned Barcode: {barcode}</p>
          <div>
            <label htmlFor="quantity">Quantity to Remove:</label>
            <input
              type="number"
              id="quantity"
              min="1"
              value={quantityToRemove}
              onChange={handleQuantityChange}
            />
          </div>
          <button type="submit">Remove Part</button>
        </div>
      )}
    </form>
  );
};

export default RemovePartForm;