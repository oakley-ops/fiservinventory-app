import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Grid,
  Chip,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import axios from '../utils/axios';
import * as XLSX from 'xlsx';

interface Transaction {
  transaction_id: number;
  part_name: string;
  fiserv_part_number: string;
  machine_name: string | null;
  quantity: number;
  usage_date: string;
  reason: string;
}

const TransactionHistory: React.FC = () => {
  const [startDate, setStartDate] = useState<any>(null);
  const [endDate, setEndDate] = useState<any>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchTransactions = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/v1/parts/usage/history', {
        params: {
          startDate: dayjs(startDate).format('YYYY-MM-DD'),
          endDate: dayjs(endDate).format('YYYY-MM-DD'),
        },
      });
      setTransactions(response.data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setExportLoading(true);
      const response = await axios.get('/api/v1/parts/usage/history', {
        params: {
          startDate: dayjs(startDate).format('YYYY-MM-DD'),
          endDate: dayjs(endDate).format('YYYY-MM-DD'),
        },
      });

      const data = response.data;
      
      // Transform data for export
      const exportData = data.map((record: Transaction) => ({
        'Part Name': record.part_name,
        'Fiserv Part #': record.fiserv_part_number,
        'Machine Name': record.machine_name || 'N/A',
        'Quantity Used': record.quantity,
        'Usage Date': dayjs(record.usage_date).format('MM/DD/YYYY'),
        'Reason': record.reason
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      const columnWidths = [
        { wch: 30 }, // Part Name
        { wch: 15 }, // Fiserv Part #
        { wch: 25 }, // Machine Name
        { wch: 15 }, // Quantity Used
        { wch: 15 }, // Usage Date
        { wch: 15 }, // Reason
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
          vertical: 'center'
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
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usage History');

      // Generate filename with date range
      const filename = `parts_usage_${dayjs(startDate).format('YYYYMMDD')}_to_${dayjs(endDate).format('YYYYMMDD')}.xlsx`;
      
      // Export file with styles
      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('Error exporting usage history:', err);
      setError('Failed to export usage history');
    } finally {
      setExportLoading(false);
    }
  };

  const getQuantityDisplay = (quantity: number, reason: string) => {
    const isRestock = reason === 'Restock';
    const displayQuantity = Math.abs(quantity);
    const color = isRestock ? 'success' : 'error';
    const prefix = isRestock ? '+' : '-';

    return (
      <Chip 
        label={`${prefix}${displayQuantity}`}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="lg">
        <Box sx={{ width: '100%', p: 2 }}>
          <Typography variant="h5" gutterBottom>
            Parts Usage History
          </Typography>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  maxDate={endDate || undefined}
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  minDate={startDate || undefined}
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={fetchTransactions}
                  disabled={!startDate || !endDate || loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Search'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={handleExport}
                  disabled={!startDate || !endDate || loading || exportLoading}
                  startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
                >
                  Export
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Part Name</TableCell>
                  <TableCell>Fiserv Part #</TableCell>
                  <TableCell>Machine</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.transaction_id}>
                    <TableCell>{dayjs(transaction.usage_date).format('MMM D, YYYY h:mm A')}</TableCell>
                    <TableCell>{transaction.part_name}</TableCell>
                    <TableCell>{transaction.fiserv_part_number}</TableCell>
                    <TableCell>{transaction.machine_name || '-'}</TableCell>
                    <TableCell align="center">
                      {getQuantityDisplay(transaction.quantity, transaction.reason)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={transaction.reason}
                        color={transaction.reason === 'Restock' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {startDate && endDate ? 'No transactions found' : 'Select a date range to view transactions'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default TransactionHistory;
