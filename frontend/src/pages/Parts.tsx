// src/pages/Parts.tsx
import React from 'react';
import { Container, Typography } from '@mui/material';
import PartsList from '../components/PartsList';

interface Part {
  part_id: number;
  name: string;
  description: string;
  quantity: number;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  machine_id: number;
  supplier: string;
  image: string;
}

const Parts: React.FC = () => {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Parts Inventory
      </Typography>
      <PartsList />
    </Container>
  );
};

export default Parts;