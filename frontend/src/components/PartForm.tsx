import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store'; 
import { fetchParts } from '../store/partsSlice'; 
import BarcodeScanner from './BarcodeScanner';

interface PartFormData {
  name: string;
  description: string;
  quantity: number;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  machine_id: number; 
  supplier: string;
  image: string;
}

const PartForm: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState<PartFormData>({
    name: '',
    description: '',
    quantity: 0,
    manufacturer_part_number: '',
    fiserv_part_number: '',
    machine_id: 0, // You might need to fetch a list of machines to populate a select dropdown
    supplier: '',
    image: '',
  });

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  };

  const handleBarcodeScanned = (scannedBarcode: string) => {
    // Decide whether to populate manufacturer_part_number or fiserv_part_number
    // based on the scanned barcode format or user input
    setFormData({
      ...formData,
      manufacturer_part_number: scannedBarcode, 
      // or
      // fiserv_part_number: scannedBarcode
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await axios.post('/api/v1/parts', formData);
      // Dispatch an action to update the parts list in the Redux store
      dispatch(fetchParts()); 
      // Optionally, reset the form or show a success message
      setFormData({
        name: '',
        description: '',
        quantity: 0,
        manufacturer_part_number: '',
        fiserv_part_number: '',
        machine_id: 0,
        supplier: '',
        image: '',
      });
      alert('Part created successfully!');
    } catch (error) {
      console.error('Error creating part:', error);
      // Handle errors, e.g., display an error message to the user
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Part</h2>
      <BarcodeScanner onScan={handleBarcodeScanned} />
      <div>
      <label htmlFor="manufacturer_part_number">Manufacturer Part Number:</label>
        <input
          type="text"
          id="manufacturer_part_number"
          name="manufacturer_part_number"
          value={formData.manufacturer_part_number}
          onChange={handleChange}
        />
        
      </div>
      
      <div>
        <label htmlFor="fiserv_part_number">Fiserv Part Number:</label>
        <input
          type="text"
          id="fiserv_part_number"
          name="fiserv_part_number"
          value={formData.fiserv_part_number}
          onChange={handleChange}
        />
      </div>
      {/* ... other input fields for description, quantity, etc. */}
      <button type="submit">Create</button>
      
    </form>
    
  );
};

export default PartForm;