// src/pages/Parts.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { fetchParts } from '../store/partsSlice';
import PartsList from '../components/PartsList';
import AssignPartToMachineForm from '../components/AssignPartToMachineForm';
import { Container, Row, Col } from 'react-bootstrap';
import { Route, Routes } from 'react-router-dom';
import RestockComponent from '../components/RestockComponent';
import ImportParts from '../components/ImportParts';
import AddPart from '../components/AddPart';
import PartSearch from '../components/PartSearch';

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
  const dispatch = useDispatch<AppDispatch>();
  const [showAddPartModal, setShowAddPartModal] = useState(false);

  useEffect(() => {
    dispatch(fetchParts());
  }, [dispatch]);

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h1>Parts Inventory</h1>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <PartSearch />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <AssignPartToMachineForm />
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <PartsList onAddPart={() => setShowAddPartModal(true)} />
        </Col>
      </Row>

      {/* Render AddPart component directly with show prop */}
      <AddPart 
        show={showAddPartModal} 
        handleClose={() => setShowAddPartModal(false)} 
      />

      <Routes>
        <Route path="restock" element={<RestockComponent />} />
        <Route path="import" element={<ImportParts />} />
      </Routes>
    </Container>
  );
};

export default Parts;