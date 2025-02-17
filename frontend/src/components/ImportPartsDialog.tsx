import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  LinearProgress,
  Link,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';
import axios from '../utils/axios';

interface ImportPartsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ExcelPart {
  name: string;
  description: string;
  manufacturer: string;
  manufacturer_part_number: string;
  fiserv_part_number: string;
  quantity: number;
  minimum_quantity: number;
  location: string;
  notes: string;
  cost: number;
}

const ImportPartsDialog: React.FC<ImportPartsDialogProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ExcelPart[]>([]);

  const downloadTemplate = () => {
    const headers = [
      'Part Number',
      'Description',
      'Quantity',
      'Location',
      'Manufacturer',
      'Cost'
    ];

    const sampleData = [
      [
        'ABC123',
        'Sample Part Description',
        '10',
        'Sensor Cabinet',
        'Sample Manufacturer',
        '99.99'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Parts Import');
    XLSX.writeFile(wb, 'parts_import_template.xlsx');
  };

  const validateData = (jsonData: any[]): ExcelPart[] => {
    console.log('Validating data:', jsonData);
    const validatedData: ExcelPart[] = [];
    const errors: string[] = [];

    // Skip the header row
    const dataRows = jsonData.slice(1);

    dataRows.forEach((row: any, index: number) => {
      try {
        const partNumber = row['Part Number']?.toString().trim();
        const description = row['Description']?.toString().trim();
        const quantity = row['Quantity']?.toString().trim();
        const location = row['Location']?.toString().trim() || 'Sensor Cabinet';
        const manufacturer = row['Manufacturer']?.toString().trim() || '';
        const cost = row['Cost']?.toString().trim();

        if (!partNumber) {
          errors.push(`Row ${index + 1}: Missing part number`);
          return;
        }

        let parsedQuantity = 0;
        if (quantity) {
          parsedQuantity = parseInt(quantity);
          if (isNaN(parsedQuantity)) {
            errors.push(`Row ${index + 1}: Invalid quantity "${quantity}" for part ${partNumber}`);
            return;
          }
        }

        let parsedCost = 0;
        if (cost) {
          parsedCost = parseFloat(cost);
          if (isNaN(parsedCost)) {
            errors.push(`Row ${index + 1}: Invalid cost "${cost}" for part ${partNumber}`);
            return;
          }
        }

        const part: ExcelPart = {
          name: description || partNumber,
          description: description || '',
          manufacturer: manufacturer,
          manufacturer_part_number: partNumber,
          fiserv_part_number: partNumber,
          quantity: parsedQuantity,
          minimum_quantity: 1,
          location: location,
          notes: '',
          cost: parsedCost
        };

        console.log('Created part object:', part);
        validatedData.push(part);
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error);
        errors.push(`Row ${index + 1}: Error processing row - ${error}`);
      }
    });

    console.log('Validation complete:', {
      validPartsCount: validatedData.length,
      errorCount: errors.length
    });

    if (errors.length > 0) {
      console.error('Validation errors:', errors);
      throw new Error(errors.join('\n'));
    }

    if (validatedData.length === 0) {
      throw new Error('No valid parts found in the Excel file. Please make sure your file follows the expected format:\n' +
        '- First column: Part Number\n' +
        '- Second column: Description\n' +
        '- Third column: Quantity (optional)\n' +
        '- Fourth column: Location (optional)\n' +
        '- Fifth column: Manufacturer (optional)\n' +
        '- Sixth column: Cost (optional)');
    }

    return validatedData;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setPreview([]);
      
      console.log('Reading file:', file.name);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          console.log('Workbook sheets:', workbook.SheetNames);
          if (workbook.SheetNames.length === 0) {
            throw new Error('Excel file is empty');
          }

          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: ['Part Number', 'Description', 'Quantity', 'Location', 'Manufacturer', 'Cost'],
            raw: true,
            defval: '',
            blankrows: false
          });
          
          console.log('Parsed Excel data:', jsonData);

          if (jsonData.length === 0) {
            throw new Error('No data found in Excel file');
          }

          const validatedData = validateData(jsonData);
          console.log('Validated data:', validatedData);
          setPreview(validatedData);
        } catch (error) {
          console.error('Error processing Excel file:', error);
          setError(error instanceof Error ? error.message : 'Invalid file format');
          setPreview([]);
        }
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        setError('Error reading file');
        setPreview([]);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      setError('Error reading file');
      setPreview([]);
    }
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      setError('No valid data to import');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      console.log('Sending data to server:', JSON.stringify(preview, null, 2));
      const response = await axios.post('/api/v1/parts/bulk', preview);
      console.log('Server response:', response.data);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.response?.data?.error || 
                         error.response?.data?.details || 
                         error.message ||
                         'Failed to import parts. Please try again.';
      console.error('Error details:', {
        message: errorMessage,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import Parts from Excel</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            Upload your Excel file containing parts data. The importer expects the following format:
          </Typography>
          <Typography component="div" variant="body2" sx={{ mb: 2 }}>
            <ul>
              <li>First column: Part Number</li>
              <li>Second column: Description</li>
              <li>Third column: Quantity (optional)</li>
              <li>Fourth column: Location (optional)</li>
              <li>Fifth column: Manufacturer (optional)</li>
              <li>Sixth column: Cost (optional)</li>
            </ul>
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <input
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            id="import-file"
            type="file"
            onChange={handleFileUpload}
          />
          <label htmlFor="import-file">
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUploadIcon />}
              disabled={uploading}
            >
              Choose File
            </Button>
          </label>
        </Box>

        {preview.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Found {preview.length} valid parts to import
            </Alert>
            <Typography variant="subtitle2" gutterBottom>
              Preview of parts to be imported:
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Part Number</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell>Location</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice(0, 5).map((part, index) => (
                    <TableRow key={index}>
                      <TableCell>{part.name}</TableCell>
                      <TableCell>{part.description}</TableCell>
                      <TableCell>{part.manufacturer_part_number}</TableCell>
                      <TableCell align="right">{part.quantity}</TableCell>
                      <TableCell>{part.location}</TableCell>
                    </TableRow>
                  ))}
                  {preview.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        ... and {preview.length - 5} more parts
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {uploading && <LinearProgress sx={{ mt: 2 }} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={uploading || preview.length === 0}
        >
          Import {preview.length} Parts
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportPartsDialog;
