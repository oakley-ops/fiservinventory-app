// frontend/src/store/machinesSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface Machine {
  machine_id: number;
  name: string;
  model_number: string;
  serial_number: string;
}

interface MachinesState {
  machines: Machine[];
  loading: boolean;
  error: string | null;
}

const initialState: MachinesState = {
  machines: [],
  loading: false,
  error: null,
};

export const fetchMachines = createAsyncThunk('machines/fetchMachines', async () => {
  const response = await axios.get<Machine[]>('/api/v1/machines');
  return response.data;
});

const machinesSlice = createSlice({
  name: 'machines',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMachines.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMachines.fulfilled, (state, action) => {
        state.loading = false;
        state.machines = action.payload;
      })
      .addCase(fetchMachines.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch machines';
      });
  },
});

export default machinesSlice.reducer;