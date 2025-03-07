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
import axiosInstance from '../utils/axios';
import RestockForm from './RestockForm';
import PartsUsageDialog from './PartsUsageDialog';
import ImportPartsDialog from './ImportPartsDialog';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams,
  GridPaginationModel,
  GridRowClassNameParams,
  DataGridProps,
  GridPreProcessEditCellProps,
  GridValueGetter
} from '@mui/x-data-grid';

import { styled } from '@mui/material/styles';
import ModalPortal from './ModalPortal';

// Add this at the top of the component to force no caching
// axios.defaults.headers.common['Cache-Control'] = 'no-cache, no-store, must-revalidate';
// axios.defaults.headers.get['Cache-Control'] = 'no-cache, no-store, must-revalidate';
// axios.defaults.headers.get['Pragma'] = 'no-cache';

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
  unit_cost: number;
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
  unit_cost: number | '';
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
  unit_cost: '',
  status: 'active'
};

// Add this function outside the component
const createCostColumn = (): GridColDef => {
  return {
    field: 'unit_cost',
    headerName: 'Cost',
    type: 'number',
    flex: 0.5,
    valueGetter: (params: { row: Part | undefined; value: any }) => {
      if (!params.row) return 0;
      
      const partId = params.row.part_id || 'unknown';
      const partName = params.row.name || 'unknown';
      
      console.log(`💰 COST valueGetter for ${partName}:`, {
        unit_cost: params.row.unit_cost,
        unit_cost_type: typeof params.row.unit_cost
      });
      
      // DIRECT TEST: Based on part ID, return hardcoded costs for the first few parts
      // This is to test if our valueGetter is working at all
      if (partId === 587) return 100.20;
      if (partId === 586) return 15.50;
      if (partId === 585) return 21.00;
      if (partId === 584) return 26.50;
      if (partId === 583) return 32.00;
      
      // Simple and direct approach
      let costValue = 0;
      
      // Try to parse the unit_cost value, first making sure it's a number
      if (params.row.unit_cost !== undefined && params.row.unit_cost !== null) {
        // Force to number
        costValue = Number(params.row.unit_cost);
      }
      
      if (isNaN(costValue)) costValue = 0;
      console.log(`💰 COST calculated for ${partName}:`, costValue);
      
      return costValue;
    },
    renderCell: (params: GridRenderCellParams) => {
      const value = params.value;
      
      if (value === null || value === undefined) {
        return <span>-</span>;
      }
      
      const numValue = Number(value);
      if (isNaN(numValue)) {
        return <span>-</span>;
      }
      
      const result = `$${numValue.toFixed(2)}`;
      return <span>{result}</span>;
    }
  };
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
    'name', 'fiserv_part_number', 'manufacturer_part_number', 'location', 
    'quantity'
  ]);

  // Add new state variables
  const [locations, setLocations] = useState<string[]>([]);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);

  const actionColumn: GridColDef = {
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
  };

  // Define base columns without the cost column
  const baseColumns: GridColDef[] = [
    { field: 'part_id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'description', headerName: 'Description', flex: 1.5 },
    { field: 'manufacturer_part_number', headerName: 'Manufacturer Part #', flex: 1 },
    { field: 'fiserv_part_number', headerName: 'Fiserv Part #', flex: 1 },
    { field: 'location', headerName: 'Location', flex: 0.7 },
    { field: 'quantity', headerName: 'Quantity', type: 'number', flex: 0.5 },
    { field: 'minimum_quantity', headerName: 'Min Quantity', type: 'number', flex: 0.5 },
    { field: 'last_ordered_date', headerName: 'Last Ordered', type: 'date', flex: 1 },
    { 
      field: 'status', 
      headerName: 'Status', 
      flex: 0.7,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value ? params.value.charAt(0).toUpperCase() + params.value.slice(1) : 'Unknown'} 
          color={params.value === 'active' ? 'success' : 'error'}
        />
      ) 
    }
  ];

  // Add the cost column and action column
  const columnsWithActions: GridColDef[] = [
    ...baseColumns,
    createCostColumn(),
    actionColumn
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
      console.log('💰 COST DEBUG: Starting fetchParts');
      const { page, pageSize } = paginationModel;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await axiosInstance.get(`/api/v1/parts?${params}`);
      
      // 💰 DEBUG: Log the entire raw response
      console.log('💰 COST DEBUG: Full API Response', response);
      console.log('💰 COST DEBUG: Raw items array', response.data.items);
      
      // Check the first 3 items for unit_cost values
      if (response.data.items && response.data.items.length > 0) {
        const sampleItems = response.data.items.slice(0, 3);
        console.log('💰 COST DEBUG: First 3 items from API:');
        sampleItems.forEach((item: any, i: number) => {
          console.log(`💰 Item ${i+1} (${item.name}):`, {
            unit_cost_raw: item.unit_cost,
            unit_cost_type: typeof item.unit_cost,
            cost_raw: item.cost,
            cost_type: typeof item.cost,
            allKeys: Object.keys(item).join(', ')
          });
        });
      }

      const updatedParts = (response.data.items || []).map((part: any, index: number) => {
        // Only log the first 3 parts in detail to avoid console spam
        const shouldLog = index < 3;
        
        if (shouldLog) {
          console.log(`💰 COST DEBUG: Processing part ${index+1} (${part.name})`);
          console.log('💰 COST DEBUG: Raw part data:', part);
          console.log('💰 COST DEBUG: API returns unit_cost =', part.unit_cost, 'type =', typeof part.unit_cost);
          console.log('💰 COST DEBUG: API returns cost =', part.cost, 'type =', typeof part.cost);
        }
        
        // The API returns both unit_cost and cost as the same value (unit_cost is duplicated as cost)
        // We'll use whichever one is available and valid
        let unitCostValue = 0;
        
        // Check unit_cost first (primary field)
        if (part.unit_cost !== undefined && part.unit_cost !== null) {
          // Try parsing if it's a string
          if (typeof part.unit_cost === 'string') {
            unitCostValue = parseFloat(part.unit_cost);
          } else {
            unitCostValue = Number(part.unit_cost);
          }
        } 
        // Fall back to cost if unit_cost wasn't available
        else if (part.cost !== undefined && part.cost !== null) {
          if (typeof part.cost === 'string') {
            unitCostValue = parseFloat(part.cost);
          } else {
            unitCostValue = Number(part.cost);
          }
        }
        
        // Ensure we don't have NaN
        if (isNaN(unitCostValue)) {
          unitCostValue = 0;
        }
        
        if (shouldLog) {
          console.log('💰 COST DEBUG: Final parsed cost value:', unitCostValue);
        }
        
        // Create processed part with properly typed fields
        const processedPart: Part = {
          ...part,
          part_id: part.part_id,
          name: part.name || '',
          description: part.description || '',
          manufacturer_part_number: part.manufacturer_part_number || '',
          fiserv_part_number: part.fiserv_part_number || '',
          quantity: Number(part.quantity) || 0,
          minimum_quantity: Number(part.minimum_quantity) || 0,
          location: part.location !== null && part.location !== undefined ? String(part.location) : '',
          unit_cost: Number(unitCostValue), 
          notes: part.notes || '',
          last_ordered_date: part.last_ordered_date || '',
          status: part.status || 'active'
        };
        
        if (shouldLog) {
          console.log('💰 COST DEBUG: Final processed part:', processedPart);
          console.log('💰 COST DEBUG: Final unit_cost value:', unitCostValue, 'type:', typeof unitCostValue);
        }
        
        // Add direct verification that unit_cost is preserved in the object
        const verifyUnitCost = processedPart.unit_cost;
        if (shouldLog) {
          console.log('💰 VERIFY unit_cost directly from object:', verifyUnitCost, 'type:', typeof verifyUnitCost);
        }
        
        return processedPart;
      });
      
      // Check processed parts before setting state
      if (updatedParts.length > 0) {
        console.log('💰 COST DEBUG: First 3 processed parts:');
        const sampleProcessed = updatedParts.slice(0, 3);
        sampleProcessed.forEach((part: Part, i: number) => {
          console.log(`💰 Processed Item ${i+1} (${part.name}):`, {
            unit_cost: part.unit_cost,
            cost: part.cost,
            unit_cost_type: typeof part.unit_cost,
            cost_type: typeof part.cost
          });
          
          // Force conversion to number as a last resort
          if (typeof part.unit_cost === 'string') {
            console.log(`💰 FORCING conversion of unit_cost for ${part.name} from "${part.unit_cost}" to number`);
            part.unit_cost = Number(part.unit_cost);
          }
        });
      }
      
      console.log('💰 SETTING STATE with processed parts:', updatedParts.slice(0, 3));
      
      setTotalItems(response.data.total);
      setParts(updatedParts);
      setLoading(false);
    } catch (error) {
      console.error(error);
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
      unit_cost: part.unit_cost ?? part.cost ?? 0,
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
    if (name === 'quantity' || name === 'minimum_quantity' || name === 'unit_cost') {
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
      unit_cost: typeof formData.unit_cost === 'string' ? 0 : Number(formData.unit_cost)
    };

    try {
      if (isEditing && selectedPart) {
        const id = selectedPart.part_id || selectedPart.id;
        await axiosInstance.put(`/api/v1/parts/${id}`, submissionData);
        setSuccess('Part updated successfully');
      } else {
        await axiosInstance.post('/api/v1/parts', submissionData);
        setSuccess('Part added successfully');
      }
      setOpenDialog(false);
      setFormData(initialFormData);
      setIsEditing(false);
      await fetchParts(); // Refresh the data
    } catch (error: any) {
      console.error('Error saving part:', error.response?.data || error);
      setError(error.response?.data?.message || 'Failed to save part');
    }
  };

  const handleColumnVisibilityChange = useCallback((column: string) => {
    setVisibleColumns((prevVisibleColumns) => {
      if (prevVisibleColumns.includes(column)) {
        return prevVisibleColumns.filter((col) => col !== column);
      } else {
        return [...prevVisibleColumns, column];
      }
    });
    setColumnVisibilityMenuAnchor(null);
  }, []);

  const handleDiscontinue = async (part: Part) => {
    if (!window.confirm('Are you sure you want to mark this part as discontinued?')) {
      return;
    }

    try {
      const partId = part.part_id || part.id;
      if (!partId) {
        throw new Error('Cannot discontinue part without a valid ID');
      }
      
      await axiosInstance.delete(`/api/v1/parts/${partId}`);
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
      const response = await axiosInstance.get('/api/v1/parts');
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
      const response = await axiosInstance.get('/api/v1/parts');
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
        'Cost': part.unit_cost ? `$${Number(part.unit_cost).toFixed(2)}` : '-',
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
          {columnsWithActions.map((column) => (
            <MenuItem
              key={column.field}
              onClick={() => handleColumnVisibilityChange(column.field)}
            >
              <Checkbox
                checked={visibleColumns.includes(column.field)}
                onChange={() => {}}
              />
              {column.headerName}
            </MenuItem>
          ))}
        </Menu>

        {/* Parts Table */}
        <Paper sx={{ width: '100%', mb: 2 }}>
          <Box sx={{ width: '100%', height: 650 }}>
            <StyledDataGrid
              columns={columnsWithActions.filter(col => visibleColumns.includes(col.field)) as readonly GridColDef<any>[]}
              rows={parts}
              getRowId={(row) => row.part_id || row.id || Math.random().toString()}
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
              keepNonExistentRowsSelected={false}
              disableColumnMenu={true}
              disableVirtualization={false}
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
              <Typography><strong>Cost:</strong> ${(selectedPart.unit_cost || 0).toFixed(2)}</Typography>
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
                      name="unit_cost"
                      min="0"
                      step="0.01"
                      value={formData.unit_cost}
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
