import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Checkbox,
  ListItemText,
  LinearProgress,
  Stack,
  Grid,
  InputAdornment,
  Collapse,
  Pagination,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import axios from '../utils/axios';
import RestockForm from './RestockForm';
import PartsUsageDialog from './PartsUsageDialog';
import ImportPartsDialog from './ImportPartsDialog';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridPaginationModel,
  GridRowClassNameParams,
  DataGridProps
} from '@mui/x-data-grid';

import { styled } from '@mui/material/styles';
import ModalPortal from './ModalPortal';

const StyledDataGrid = styled(DataGrid, {
  shouldForwardProp: (prop) => ![
    'rowId',
    'offsetLeft',
    'columnsTotalWidth',
    'paginationMeta'
  ].includes(prop.toString()),
})({});

interface Part {
  part_id: number;
  name: string;
  description: string;
  manufacturer: string;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  quantity: number;
  minimum_quantity: number;
  location: string;
  notes: string;
  last_ordered_date: string;
  cost: number;
  status?: 'active' | 'discontinued';
  [key: string]: any;
}

interface PartFormData {
  name: string;
  description: string;
  manufacturer: string;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  quantity: number | '';
  minimum_quantity: number | '';
  location: string;
  notes: string;
  cost: number | '';
  status: 'active' | 'discontinued';
}

const initialFormData: PartFormData = {
  name: '',
  description: '',
  manufacturer: '',
  manufacturer_part_number: '',
  fiserv_part_number: '',
  quantity: '',
  minimum_quantity: '',
  location: '',
  notes: '',
  cost: '',
  status: 'active'
};

const PartsList: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openRestockForm, setOpenRestockForm] = useState(false);
  const [openUsageDialog, setOpenUsageDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PartFormData>(initialFormData);
  const [isEditing, setIsEditing] = useState(false);

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [totalItems, setTotalItems] = useState(0);

  // Advanced search state
  const [filters, setFilters] = useState({
    partNumber: '',
    location: '',
    minQuantity: '',
    maxQuantity: ''
  });

  // Column visibility state
  const [columnVisibilityMenuAnchor, setColumnVisibilityMenuAnchor] = useState<null | HTMLElement>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'fiserv_part_number',
    'manufacturer_part_number',
    'location',
    'quantity',
    'minimum_quantity',
    'status',
    'actions'
  ]);

  // Add new state variables
  const [locations, setLocations] = useState<string[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'fiserv_part_number', headerName: 'Fiserv Part #', flex: 1 },
    { field: 'manufacturer_part_number', headerName: 'Manufacturer Part #', flex: 1 },
    { field: 'manufacturer', headerName: 'Manufacturer', flex: 1 },
    { field: 'location', headerName: 'Location', flex: 1 },
    { field: 'quantity', headerName: 'Quantity', type: 'number', flex: 0.5 },
    { field: 'minimum_quantity', headerName: 'Min Quantity', type: 'number', flex: 0.5 },
    { field: 'cost', headerName: 'Cost', type: 'number', flex: 0.5 },
    { field: 'last_ordered_date', headerName: 'Last Ordered', type: 'date', flex: 1 },
    { 
      field: 'status',
      headerName: 'Status',
      flex: 0.7,
      renderCell: (params: GridRenderCellParams<Part>) => (
        <Chip 
          label={params.value === 'discontinued' ? 'Discontinued' : 'Active'}
          color={params.value === 'discontinued' ? 'default' : 'success'}
          size="small"
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      flex: 0.8,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Part>) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton 
            size="small" 
            data-testid="edit-button"
            onClick={() => handleEdit(params.row)}
          >
            <EditIcon />
          </IconButton>
          {params.row.status !== 'discontinued' ? (
            <IconButton 
              data-testid="delete-button"
              onClick={() => handleDiscontinue(params.row)} 
              color="warning"
              title="Mark as Discontinued"
            >
              <DeleteIcon />
            </IconButton>
          ) : (
            <IconButton 
              data-testid="delete-button"
              disabled
              title="Cannot delete discontinued parts to preserve history"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>
      )
    },
  ];

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    // Clear current parts while loading new results
    setParts([]);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const fetchParts = useCallback(async () => {
    setLoading(true);
    try {
      const { page, pageSize } = paginationModel;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await axios.get(`/api/v1/parts?${params}`);
      setParts(response.data.items || []);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching parts:', error);
      setError('Failed to fetch parts');
    } finally {
      setLoading(false);
    }
  }, [paginationModel, searchTerm]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  // Debounce search to avoid too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      if (paginationModel.page !== 0) {
        setPaginationModel(prev => ({ ...prev, page: 0 }));
      } else {
        fetchParts();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchParts, paginationModel.page]);

  const handlePageChange = (
    event: React.MouseEvent<unknown> | React.ChangeEvent<unknown> | null,
    newPage: number
  ) => {
    setPaginationModel((prev) => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPaginationModel((prev) => ({ ...prev, pageSize: parseInt(event.target.value, 10) }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value,
    });
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleCloseDetails = () => {
    setSelectedPart(null);
  };

  const handleEdit = (part: Part) => {
    setFormData({
      name: part.name,
      description: part.description || '',
      manufacturer: part.manufacturer || '',
      manufacturer_part_number: part.manufacturer_part_number || '',
      fiserv_part_number: part.fiserv_part_number || '',
      quantity: Number(part.quantity) || '',
      minimum_quantity: Number(part.minimum_quantity) || '',
      location: part.location || '',
      notes: part.notes || '',
      cost: typeof part.cost === 'number' ? part.cost : '',
      status: part.status || 'active'
    });
    setIsEditing(true);
    setSelectedPart(part);
    setOpenDialog(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Handle numeric fields
    if (name === 'quantity' || name === 'minimum_quantity' || name === 'cost') {
      if (value === '') {
        setFormData(prev => ({
          ...prev,
          [name]: ''
        }));
        return;
      }

      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue) || parsedValue < 0) {
        return; // Don't update if invalid number
      }

      setFormData(prev => ({
        ...prev,
        [name]: parsedValue
      }));
      return;
    }

    // Handle non-numeric fields
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Convert empty string values to 0 for numeric fields before submission
    const submissionData = {
      ...formData,
      quantity: typeof formData.quantity === 'string' ? 0 : formData.quantity,
      minimum_quantity: typeof formData.minimum_quantity === 'string' ? 0 : formData.minimum_quantity,
      cost: typeof formData.cost === 'string' ? 0 : formData.cost
    };

    try {
      if (isEditing && selectedPart) {
        const id = selectedPart.part_id || selectedPart.fiserv_part_number;
        await axios.put(`/api/v1/parts/${id}`, submissionData);
        setSuccess('Part updated successfully');
      } else {
        await axios.post('/api/v1/parts', submissionData);
        setSuccess('Part added successfully');
      }
      setOpenDialog(false);
      setFormData(initialFormData);
      setIsEditing(false);
      fetchParts();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save part');
    }
  };

  const handleColumnVisibilityChange = (column: string) => {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((col) => col !== column)
        : [...prev, column]
    );
  };

  const handleDiscontinue = async (part: Part) => {
    if (!window.confirm('Are you sure you want to mark this part as discontinued?')) {
      return;
    }

    try {
      const partId = part.id || part.part_id;
      if (!partId) {
        throw new Error('Cannot discontinue part without a valid ID');
      }
      
      await axios.put(`/api/v1/parts/${partId}`, { 
        status: 'discontinued' 
      });
      setSuccess('Part marked as discontinued successfully');
      fetchParts();
    } catch (error) {
      console.error('Error marking part as discontinued:', error);
      setError('Failed to mark part as discontinued. Please try again.');
    }
  };

  // Custom loading overlay component
  const CustomLoadingOverlay = () => (
    <Stack sx={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} alignItems="center" justifyContent="center">
      <Box sx={{ width: '100%', position: 'absolute', top: 0 }}>
        <LinearProgress />
      </Box>
    </Stack>
  );

  // Custom no rows overlay component
  const CustomNoRowsOverlay = ({ error }: { error: string | null }) => (
    <Stack height="100%" alignItems="center" justifyContent="center">
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Typography>No parts found</Typography>
      )}
    </Stack>
  );

  interface CustomDataGridProps extends DataGridProps {
    rowId?: never;
    offsetLeft?: never;
    columnsTotalWidth?: never;
  }

  const filterProps = (props: CustomDataGridProps): DataGridProps => {
    const { rowId, offsetLeft, columnsTotalWidth, ...cleanProps } = props;
    return cleanProps;
  };

  // Add function to fetch unique locations
  const fetchLocations = async () => {
    try {
      const response = await axios.get('/api/v1/parts');
      const parts = response.data.items || response.data;
      
      const uniqueLocations = Array.from(
        new Set(parts.map((part: Part) => part.location))
      )
        .filter((location): location is string => !!location)
        .sort();
      
      setLocations(uniqueLocations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Failed to fetch locations');
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  // Add export function
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const response = await axios.get('/api/v1/parts');
      let parts = response.data.items || response.data;

      // Filter parts by location if selected
      if (selectedLocation) {
        parts = parts.filter((part: Part) => part.location === selectedLocation);
      }

      // Transform data for export
      const exportData = parts.map((part: Part) => ({
        'Name': part.name,
        'Fiserv Part #': part.fiserv_part_number,
        'Manufacturer Part #': part.manufacturer_part_number,
        'Manufacturer': part.manufacturer,
        'Location': part.location,
        'Quantity': part.quantity,
        'Min Quantity': part.minimum_quantity,
        'Cost': part.cost,
        'Last Ordered': part.last_ordered_date ? new Date(part.last_ordered_date).toLocaleDateString() : 'N/A',
        'Description': part.description,
        'Notes': part.notes,
        'Status': part.status
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 30 }, // Name
        { wch: 15 }, // Fiserv Part #
        { wch: 20 }, // Manufacturer Part #
        { wch: 20 }, // Manufacturer
        { wch: 15 }, // Location
        { wch: 10 }, // Quantity
        { wch: 12 }, // Min Quantity
        { wch: 10 }, // Cost
        { wch: 15 }, // Last Ordered
        { wch: 40 }, // Description
        { wch: 40 }, // Notes
        { wch: 10 }, // Status
      ];
      worksheet['!cols'] = columnWidths;

      // Style header row
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const headerStyle = {
        font: { bold: true },
        fill: { 
          fgColor: { rgb: "EEEEEE" },
          patternType: 'solid'
        },
        alignment: { 
          horizontal: 'center',
          vertical: 'center',
          wrapText: true
        },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // Apply header style to first row
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellRef]) continue;
        worksheet[cellRef].s = headerStyle;
      }

      // Create workbook and append sheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
      
      // Generate filename with location if selected
      const filename = selectedLocation 
        ? `inventory_${selectedLocation.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
        : `inventory_${new Date().toISOString().split('T')[0]}.xlsx`;
        
      // Export file
      XLSX.writeFile(workbook, filename);
      setSuccess('Inventory exported successfully!');
    } catch (error) {
      console.error('Error exporting inventory:', error);
      setError('Failed to export inventory');
    } finally {
      setExportLoading(false);
      setExportDialogOpen(false);
      setSelectedLocation('');
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ my: 4 }}>
        {/* Search and Filters */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search parts..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setFilters({
                      partNumber: '',
                      location: '',
                      minQuantity: '',
                      maxQuantity: ''
                    })}>
                      <InfoIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={6} container justifyContent="flex-end" spacing={1}>
            <Grid item>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#FF6600',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 102, 0, 0.8)',
                  }
                }}
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
              >
                Add Part
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#FF6600',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 102, 0, 0.8)',
                  }
                }}
                onClick={() => setOpenRestockForm(true)}
              >
                Restock Parts
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                sx={{
                  backgroundColor: '#FF6600',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 102, 0, 0.8)',
                  }
                }}
                onClick={() => setOpenUsageDialog(true)}
              >
                Check Out Parts
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={() => setImportDialogOpen(true)}
              >
                Import
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={() => setExportDialogOpen(true)}
              >
                Export
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<ViewColumnIcon />}
                onClick={(e) => setColumnVisibilityMenuAnchor(e.currentTarget)}
              >
                Columns
              </Button>
            </Grid>
          </Grid>
        </Grid>

        {/* Advanced Search Panel */}
        <Collapse in={false}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  name="partNumber"
                  label="Part Number"
                  value={filters.partNumber}
                  onChange={handleFilterChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  name="location"
                  label="Location"
                  value={filters.location}
                  onChange={handleFilterChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  name="minQuantity"
                  label="Min Quantity"
                  type="number"
                  value={filters.minQuantity}
                  onChange={handleFilterChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  name="maxQuantity"
                  label="Max Quantity"
                  type="number"
                  value={filters.maxQuantity}
                  onChange={handleFilterChange}
                  size="small"
                />
              </Grid>
            </Grid>
          </Paper>
        </Collapse>

        {/* Column Visibility Menu */}
        <Menu
          anchorEl={columnVisibilityMenuAnchor}
          open={Boolean(columnVisibilityMenuAnchor)}
          onClose={() => setColumnVisibilityMenuAnchor(null)}
        >
          {columns.map((column) => (
            <MenuItem
              key={column.field}
              onClick={() => handleColumnVisibilityChange(column.field)}
            >
              <Checkbox checked={visibleColumns.includes(column.field)} />
              <ListItemText primary={column.headerName} />
            </MenuItem>
          ))}
        </Menu>

        {/* Parts Table */}
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ width: '100%', height: 650 }}>
            <StyledDataGrid
              columns={visibleColumns.map(colKey => columns.find(c => c.field === colKey)!)}
              rows={parts.map((part, index) => ({
                ...part,
                part_id: part.id || part.part_id,
                id: part.id || part.part_id || `${part.fiserv_part_number}_${index}`,
                cost: typeof part.cost === 'number' ? Number(part.cost) : 0
              }))}
              paginationModel={paginationModel}
              onPaginationModelChange={(newModel: GridPaginationModel) => {
                setPaginationModel(newModel);
                setError(null);
              }}
              paginationMode="server"
              rowCount={totalItems}
              loading={loading}
              pageSizeOptions={[25, 50, 100]}
              disableRowSelectionOnClick={true}
              keepNonExistentRowsSelected={true}
              disableColumnMenu={true}
              disableVirtualization={true}
              getRowClassName={(params: GridRowClassNameParams) => `row-${params.id}`}
              initialState={{
                pagination: {
                  paginationModel,
                },
              }}
              slotProps={{
                toolbar: {
                  showQuickFilter: true,
                },
              }}
              sx={{
                '& .low-stock': {
                  bgcolor: 'error.lighter',
                },
                '& .MuiDataGrid-cell': {
                  cursor: 'pointer',
                  py: 1
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: '#f5f5f5',
                  borderBottom: '2px solid #e0e0e0'
                },
                '& .MuiDataGrid-cell:last-child': {
                  pr: 2
                }
              }}
            />
          </Box>
        </Paper>

        {/* Pagination */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Typography variant="body2" sx={{ mr: 2, alignSelf: 'center' }}>
            Rows per page:
          </Typography>
          <TextField
            select
            size="small"
            value={paginationModel.pageSize}
            onChange={handleRowsPerPageChange}
            sx={{ width: 100, mr: 2 }}
          >
            {[25, 50, 100].map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <Pagination
            count={Math.ceil(totalItems / paginationModel.pageSize)}
            page={paginationModel.page + 1}
            onChange={(e, p) => handlePageChange(e, p - 1)}
            color="primary"
          />
        </Box>
      </Box>

      {/* Part Details Dialog */}
      <Dialog 
        open={!!selectedPart && !openDialog} 
        onClose={handleCloseDetails} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          className: 'custom-dialog',
          sx: { margin: '1rem' }
        }}
      >
        <div className="dialog-header">
          <h5 className="dialog-title">Part Details</h5>
        </div>
        <DialogContent className="dialog-content">
          {selectedPart && (
            <Box sx={{ 
              display: 'grid', 
              gap: 2.5, 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              pt: 3,
              '& .MuiTypography-root': {
                display: 'flex',
                alignItems: 'baseline',
                '& strong': {
                  minWidth: '160px',
                  color: 'text.secondary',
                  fontWeight: 500
                }
              }
            }}>
              <Typography><strong>Name:</strong> {selectedPart.name}</Typography>
              <Typography><strong>Description:</strong> {selectedPart.description || '-'}</Typography>
              <Typography><strong>Manufacturer:</strong> {selectedPart.manufacturer || '-'}</Typography>
              <Typography><strong>Manufacturer Part #:</strong> {selectedPart.manufacturer_part_number || '-'}</Typography>
              <Typography><strong>Fiserv Part #:</strong> {selectedPart.fiserv_part_number}</Typography>
              <Typography><strong>Quantity:</strong> {selectedPart.quantity}</Typography>
              <Typography><strong>Minimum Quantity:</strong> {selectedPart.minimum_quantity}</Typography>
              <Typography><strong>Location:</strong> {selectedPart.location}</Typography>
              <Typography><strong>Cost:</strong> ${selectedPart.cost?.toFixed(2) || '-'}</Typography>
              <Typography><strong>Last Ordered:</strong> {selectedPart.last_ordered_date ? new Date(selectedPart.last_ordered_date).toLocaleDateString() : '-'}</Typography>
              <Typography><strong>Status:</strong> {selectedPart.status}</Typography>
              <Typography sx={{ gridColumn: 'span 2' }}><strong>Notes:</strong> {selectedPart.notes || '-'}</Typography>
            </Box>
          )}
        </DialogContent>
        <div className="dialog-footer">
          <Button onClick={handleCloseDetails} variant="outlined" className="btn btn-outline-secondary">Close</Button>
        </div>
      </Dialog>

      {/* Add/Edit Part Dialog */}
      <ModalPortal open={openDialog}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content custom-dialog">
            <div className="dialog-header">
              <h5 className="dialog-title">{isEditing ? 'Edit Part' : 'Add New Part'}</h5>
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
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Fiserv Part Number*</label>
                    <input
                      type="text"
                      className="form-control"
                      name="fiserv_part_number"
                      value={formData.fiserv_part_number}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manufacturer</label>
                    <input
                      type="text"
                      className="form-control"
                      name="manufacturer"
                      value={formData.manufacturer}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manufacturer Part Number</label>
                    <input
                      type="text"
                      className="form-control"
                      name="manufacturer_part_number"
                      value={formData.manufacturer_part_number}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity*</label>
                    <input
                      type="number"
                      className="form-control"
                      name="quantity"
                      min="0"
                      step="1"
                      value={formData.quantity}
                      onChange={handleInputChange}
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
                      step="1"
                      value={formData.minimum_quantity}
                      onChange={handleInputChange}
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
                      value={formData.cost}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-control"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-control"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <input
                  type="hidden"
                  name="status"
                  value={formData.status}
                />
              </div>

              <div className="dialog-footer">
                <div className="d-flex gap-2 justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setOpenDialog(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {isEditing ? 'Saving...' : 'Adding...'}
                      </>
                    ) : (
                      isEditing ? 'Save Changes' : 'Add Part'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </ModalPortal>

      {/* Restock Form Dialog */}
      <RestockForm
        open={openRestockForm}
        onClose={() => setOpenRestockForm(false)}
        onSuccess={() => {
          fetchParts();
          setSuccess('Parts restocked successfully');
        }}
      />

      {/* Parts Usage Dialog */}
      <PartsUsageDialog
        open={openUsageDialog}
        onClose={() => setOpenUsageDialog(false)}
        onSuccess={() => {
          fetchParts();
          setSuccess('Parts checked out successfully');
        }}
      />

      {/* Import Parts Dialog */}
      <ImportPartsDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onSuccess={() => {
          fetchParts();
          setSuccess('Parts imported successfully');
        }}
      />

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          className: 'custom-dialog',
          sx: { margin: '1rem' }
        }}
      >
        <div className="dialog-header">
          <h5 className="dialog-title">Export Inventory</h5>
        </div>
        <DialogContent className="dialog-content">
          <Box sx={{ pt: 3 }}>
            <Typography variant="body1" sx={{ mb: 2.5, color: 'text.secondary' }}>
              Select a location to filter the export, or leave empty to export all inventory items.
            </Typography>
            <TextField
              select
              fullWidth
              label="Select Location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="form-control"
            >
              <MenuItem value="">All Locations</MenuItem>
              {locations.map((location) => (
                <MenuItem key={location} value={location}>
                  {location}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <div className="dialog-footer">
          <div className="d-flex gap-2 justify-content-end">
            <Button
              onClick={() => setExportDialogOpen(false)}
              variant="outlined"
              className="btn btn-outline-secondary"
            >
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              variant="contained"
              disabled={exportLoading}
              className="btn btn-primary"
              startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
            >
              Export
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={!!error || !!success}
        autoHideDuration={6000}
        onClose={() => {
          setError(null);
          setSuccess(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => {
            setError(null);
            setSuccess(null);
          }}
          severity={error ? 'error' : 'success'}
          sx={{ width: '100%', borderRadius: '0.75rem' }}
        >
          {error || success}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default PartsList;
