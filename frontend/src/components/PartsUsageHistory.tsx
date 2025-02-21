import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import DownloadIcon from '@mui/icons-material/Download';
import axios from '../utils/axios';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

interface UsageRecord {
  usage_id: number;
  part_id: number;
  part_name: string;
  machine_id: number | null;
  machine_name: string | null;
  quantity: number;
  usage_date: string;
  reason: string;
}

interface PartsUsageHistoryProps {
  limit?: number;
}

const PartsUsageHistory: React.FC<PartsUsageHistoryProps> = ({ limit }) => {
  const [usageHistory, setUsageHistory] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState<dayjs.Dayjs | null>(null);
  const [endDate, setEndDate] = useState<dayjs.Dayjs | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchUsageHistory();
  }, [limit]);

  const fetchUsageHistory = async () => {
    try {
      const response = await axios.get('/api/v1/parts/usage/history', {
        params: { limit }
      });
      // Handle paginated response structure
      setUsageHistory(response.data.items || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching usage history:', err);
      setError('Failed to load usage history');
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
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD')
        }
      });

      const data = response.data;
      
      // Transform data for export
      const exportData = data.map((record: UsageRecord) => ({
        'Part Name': record.part_name,
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
      const filename = `parts_usage_${startDate.format('YYYYMMDD')}_to_${endDate.format('YYYYMMDD')}.xlsx`;
      
      // Export file with styles
      XLSX.writeFile(workbook, filename);
      setExportDialogOpen(false);
      setStartDate(null);
      setEndDate(null);
    } catch (err) {
      console.error('Error exporting usage history:', err);
      setError('Failed to export usage history');
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = dayjs(dateString);
    return date.format('MMM D, YYYY h:mm A');
  };

  const getQuantityDisplay = (record: UsageRecord) => {
    const isRestock = record.reason === 'Restock';
    const quantity = Math.abs(record.quantity);
    const color = isRestock ? 'success' : 'primary';
    const prefix = isRestock ? '+' : '-';

    return (
      <Chip 
        label={`${prefix}${quantity}`}
        color={color}
        size="small"
        variant="outlined"
      />
    );
  };

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: '100%', p: 2 }}>
        <Box sx={{ 
          mb: 3, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          backgroundColor: 'background.paper',
          padding: 2,
          borderRadius: 1
        }}>
          <Typography variant="h6" component="h2">
            Parts Usage History
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="medium"
            startIcon={<DownloadIcon />}
            onClick={() => setExportDialogOpen(true)}
            sx={{ 
              minWidth: '140px',
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            }}
          >
            Export History
          </Button>
        </Box>

        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Part Name</TableCell>
                <TableCell>Machine</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usageHistory.map((record) => (
                <TableRow key={record.usage_id}>
                  <TableCell>{formatDate(record.usage_date)}</TableCell>
                  <TableCell>{record.part_name}</TableCell>
                  <TableCell>{record.machine_name || '-'}</TableCell>
                  <TableCell align="center">{getQuantityDisplay(record)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={record.reason}
                      color={record.reason === 'Restock' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {usageHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No usage history found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Export Dialog */}
        <Dialog 
          open={exportDialogOpen} 
          onClose={() => setExportDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Export Usage History</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                maxDate={endDate || undefined}
                sx={{ width: '100%' }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                minDate={startDate || undefined}
                sx={{ width: '100%' }}
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={() => setExportDialogOpen(false)}
              size="large"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleExport}
              variant="contained"
              disabled={!startDate || !endDate || exportLoading}
              startIcon={exportLoading ? <CircularProgress size={20} /> : <DownloadIcon />}
              size="large"
            >
              Export
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default PartsUsageHistory;
