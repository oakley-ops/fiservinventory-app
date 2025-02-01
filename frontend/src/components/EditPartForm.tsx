// src/components/EditPartForm.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { fetchParts } from '../store/partsSlice';

interface Machine {
  id: number;
  name: string;
}

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

const EditPartForm: React.FC = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState<PartFormData>({
    name: '',
    description: '',
    quantity: 0,
    manufacturer_part_number: '',
    fiserv_part_number: '',
    machine_id: 0,
    supplier: '',
    image: '',
  });
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partResponse, machinesResponse] = await Promise.all([
          id ? axios.get(`/api/v1/parts/${id}`) : Promise.resolve({ data: formData }),
          axios.get('/api/v1/machines')
        ]);
        
        setFormData(partResponse.data);
        setMachines(machinesResponse.data);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'machine_id' ? Number(value) : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Part name is required');
      setIsSubmitting(false);
      return;
    }

    if (formData.quantity < 0) {
      setError('Quantity cannot be negative');
      setIsSubmitting(false);
      return;
    }

    if (!formData.machine_id) {
      setError('Please select a machine');
      setIsSubmitting(false);
      return;
    }

    try {
      await axios.put(`/api/v1/parts/${id}`, formData);
      dispatch(fetchParts());
      setSuccessMessage('Part updated successfully!');
      setTimeout(() => {
        navigate('/parts');
      }, 1500);
    } catch (error: any) {
      console.error('Error updating part:', error);
      setError(error.response?.data?.message || 'Failed to update part. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="row">
          <div className="col-md-8 offset-md-2">
            <div className="card">
              <div className="card-body text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Loading part information...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-8 offset-md-2">
          <div className="card">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Edit Part</h2>
              
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              {successMessage && (
                <div className="alert alert-success" role="alert">
                  {successMessage}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Part Name*</label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="quantity" className="form-label">Quantity*</label>
                  <input
                    type="number"
                    className="form-control"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    min="0"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="manufacturer_part_number" className="form-label">Manufacturer Part Number*</label>
                  <input
                    type="text"
                    className="form-control"
                    id="manufacturer_part_number"
                    name="manufacturer_part_number"
                    value={formData.manufacturer_part_number}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="fiserv_part_number" className="form-label">Fiserv Part Number*</label>
                  <input
                    type="text"
                    className="form-control"
                    id="fiserv_part_number"
                    name="fiserv_part_number"
                    value={formData.fiserv_part_number}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="machine_id" className="form-label">Machine*</label>
                  <select
                    className="form-select"
                    id="machine_id"
                    name="machine_id"
                    value={formData.machine_id}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select a machine</option>
                    {machines.map(machine => (
                      <option key={machine.id} value={machine.id}>
                        {machine.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label htmlFor="supplier" className="form-label">Supplier</label>
                  <input
                    type="text"
                    className="form-control"
                    id="supplier"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="image" className="form-label">Image URL</label>
                  <input
                    type="url"
                    className="form-control"
                    id="image"
                    name="image"
                    value={formData.image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Updating...
                      </>
                    ) : (
                      'Update Part'
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => navigate('/parts')}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPartForm;