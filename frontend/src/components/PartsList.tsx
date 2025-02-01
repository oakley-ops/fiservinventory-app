import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppDispatch, RootState } from '../store/store';
import { deletePart } from '../store/partsSlice';
import { Table, Button, Spinner, Alert, Badge, Modal } from 'react-bootstrap';

interface Part {
  part_id: number;
  name: string;
  description: string;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  quantity: number;
  minimum_quantity: number;
  machine_id: number;
  supplier: string;
  unit_cost: string | number;
  location: string;
  image_url?: string;
}

interface PartsListProps {
  onAddPart: () => void;
}

const PartsList: React.FC<PartsListProps> = ({ onAddPart }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { parts, loading, error } = useSelector((state: RootState) => state.parts);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [partToDelete, setPartToDelete] = useState<Part | null>(null);

  const handleDelete = async () => {
    if (partToDelete) {
      try {
        await dispatch(deletePart(partToDelete.part_id));
        setShowDeleteModal(false);
        setPartToDelete(null);
      } catch (error) {
        console.error('Failed to delete part:', error);
      }
    }
  };

  const getStockStatus = (quantity: number, minimum_quantity: number) => {
    if (quantity <= 0) {
      return <Badge bg="danger">Out of Stock</Badge>;
    } else if (quantity < minimum_quantity) {
      return <Badge bg="warning" text="dark">Low Stock</Badge>;
    }
    return <Badge bg="success">In Stock</Badge>;
  };

  const formatCurrency = (value: string | number): string => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(numValue) ? '$0.00' : `$${numValue.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-3">
        <Alert.Heading>Error Loading Parts</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (!parts || parts.length === 0) {
    return (
      <div className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Button variant="primary" onClick={onAddPart}>
            Add New Part
          </Button>
        </div>
        <Alert variant="info">
          <Alert.Heading>No Parts Found</Alert.Heading>
          <p>There are no parts in the inventory yet.</p>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Button variant="primary" onClick={onAddPart}>
            Add New Part
          </Button>
        </div>

        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>MFG #</th>
              <th>Fiserv #</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Location</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part: Part) => (
              <tr key={part.part_id}>
                <td>{part.part_id}</td>
                <td>
                  <strong>{part.name}</strong>
                  <br />
                  <small className="text-muted">{part.description}</small>
                </td>
                <td>{part.manufacturer_part_number}</td>
                <td>{part.fiserv_part_number}</td>
                <td className="text-center">{part.quantity}</td>
                <td className="text-center">
                  {getStockStatus(part.quantity, part.minimum_quantity)}
                </td>
                <td>{part.location}</td>
                <td>{part.supplier}</td>
                <td>
                  <div className="d-flex gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setPartToDelete(part);
                        setShowDeleteModal(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the part "{partToDelete?.name}"?
          This action cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete Part
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default PartsList;
