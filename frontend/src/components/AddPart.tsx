import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { addPart } from '../store/partsSlice';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { Part } from '../store/partsSlice';

const AddPart: React.FC<{ show: boolean; handleClose: () => void }> = ({ show, handleClose }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [manufacturerPartNumber, setManufacturerPartNumber] = useState('');
  const [fiservPartNumber, setFiservPartNumber] = useState('');
  const [location, setLocation] = useState('');
  const [supplier, setSupplier] = useState('');
  const [unitCost, setUnitCost] = useState(0);
  const [machineId, setMachineId] = useState(0);
  const [minimumQuantity, setMinimumQuantity] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setQuantity(0);
    setManufacturerPartNumber('');
    setFiservPartNumber('');
    setLocation('');
    setSupplier('');
    setUnitCost(0);
    setMachineId(0);
    setMinimumQuantity(0);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const newPart: Part = {
      part_id: 0,
      name,
      description,
      quantity,
      minimum_quantity: minimumQuantity,
      machine_id: machineId,
      supplier,
      unit_cost: unitCost,
      location,
      manufacturer_part_number: manufacturerPartNumber,
      fiserv_part_number: fiservPartNumber,
    };

    try {
      await dispatch(addPart(newPart)).unwrap();
      resetForm();
      handleClose();
    } catch (err) {
      setError('Failed to add part. Please try again.');
      console.error('Failed to add part:', err);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Add New Part</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3" controlId="formPartName">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter part name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPartDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formPartQuantity">
            <Form.Label>Quantity</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formManufacturerPartNumber">
            <Form.Label>Manufacturer Part Number</Form.Label>
            <Form.Control
              type="text"
              value={manufacturerPartNumber}
              onChange={(e) => setManufacturerPartNumber(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formFiservPartNumber">
            <Form.Label>Fiserv Part Number</Form.Label>
            <Form.Control
              type="text"
              value={fiservPartNumber}
              onChange={(e) => setFiservPartNumber(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formLocation">
            <Form.Label>Location</Form.Label>
            <Form.Control
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formSupplier">
            <Form.Label>Supplier</Form.Label>
            <Form.Control
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formUnitCost">
            <Form.Label>Unit Cost</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formMachineId">
            <Form.Label>Machine ID</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={machineId}
              onChange={(e) => setMachineId(Number(e.target.value))}
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="formMinimumQuantity">
            <Form.Label>Minimum Quantity</Form.Label>
            <Form.Control
              type="number"
              min="0"
              value={minimumQuantity}
              onChange={(e) => setMinimumQuantity(Number(e.target.value))}
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add Part
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default AddPart;
