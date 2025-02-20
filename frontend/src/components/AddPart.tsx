import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { addPart } from '../store/partsSlice';
import { Part } from '../store/partsSlice';
import '../styles/Dialog.css';

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
  const [minimumQuantity, setMinimumQuantity] = useState(0);
  const [notes, setNotes] = useState('');
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
    setMinimumQuantity(0);
    setNotes('');
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
      supplier,
      unit_cost: unitCost,
      location,
      manufacturer_part_number: manufacturerPartNumber,
      fiserv_part_number: fiservPartNumber,
      status: 'active',
      notes,
      machine_id: 0
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

  if (!show) return null;

  return (
    <div className="modal">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content custom-dialog">
          <div className="dialog-header">
            <h5 className="dialog-title">Add New Part</h5>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="dialog-content">
              {error && (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              )}
              <div className="grid-container grid-2-cols">
                <div className="form-group">
                  <label className="form-label">Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fiserv Part Number*</label>
                  <input
                    type="text"
                    className="form-control"
                    name="fiserv_part_number"
                    value={fiservPartNumber}
                    onChange={(e) => setFiservPartNumber(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Manufacturer</label>
                  <input
                    type="text"
                    className="form-control"
                    name="manufacturer"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Manufacturer Part Number</label>
                  <input
                    type="text"
                    className="form-control"
                    name="manufacturer_part_number"
                    value={manufacturerPartNumber}
                    onChange={(e) => setManufacturerPartNumber(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity*</label>
                  <input
                    type="number"
                    className="form-control"
                    name="quantity"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Minimum Quantity*</label>
                  <input
                    type="number"
                    className="form-control"
                    name="minimum_quantity"
                    min="0"
                    value={minimumQuantity}
                    onChange={(e) => setMinimumQuantity(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cost ($)*</label>
                  <input
                    type="number"
                    className="form-control"
                    name="cost"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-control"
                    name="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="form-group mt-3">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  name="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="dialog-footer">
              <div className="d-flex gap-2 justify-content-end">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Part
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddPart;
