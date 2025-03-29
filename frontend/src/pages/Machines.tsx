import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import MachineList from '../components/MachineList';
import MachineForm from '../components/MachineForm';
import Machine from '../components/Machine';
import RestockComponent from '../components/RestockComponent';
import MachineCostReport from '../components/MachineCostReport';

const Machines: React.FC = () => {
  return (
    <Container className="py-4">
      <Routes>
        {/* List all machines */}
        <Route index element={<MachineList />} />
        
        {/* Add new machine */}
        <Route path="new" element={<MachineForm />} />
        
        {/* View machine details */}
        <Route path=":id" element={<Machine />} />
        
        {/* Edit existing machine */}
        <Route path=":id/edit" element={<MachineForm />} />
        
        {/* Restock parts */}
        <Route path="restock" element={<RestockComponent />} />

        {/* Machine costs report */}
        <Route path="costs" element={<MachineCostReport />} />
      </Routes>
    </Container>
  );
};

export default Machines;