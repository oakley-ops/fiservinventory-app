import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { TopUsedPart } from '../types';

interface TopUsedPartsChartProps {
  data: TopUsedPart[];
}

const TopUsedPartsChart: React.FC<TopUsedPartsChartProps> = ({ data }) => {
  console.log('TopUsedPartsChart received data:', data);

  // Colors for the bars
  const colors = {
    usage: '#2196f3',
    frequency: '#ff9800',
    quantity: '#4caf50'
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const part = data.find(p => p.part_name === label);
    if (!part) return null;

    return (
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px'
      }}>
        <p style={{ margin: '0 0 5px', fontWeight: 'bold' }}>{label}</p>
        <p style={{ margin: '0 0 5px', color: colors.usage }}>
          Total Usage: {part.total_usage} units
        </p>
        <p style={{ margin: '0 0 5px', color: colors.frequency }}>
          Usage Frequency: {part.usage_frequency} times
        </p>
        <p style={{ margin: '0', color: colors.quantity }}>
          Current Stock: {part.current_quantity} / {part.minimum_quantity} (min)
        </p>
      </div>
    );
  };

  console.log('Rendering chart with data length:', data.length);

  return (
    <div style={{ width: '100%', height: 400 }}>
      {data && data.length > 0 ? (
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="part_name"
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
            />
            <YAxis 
              yAxisId="left" 
              orientation="left" 
              stroke={colors.usage}
              label={{ value: 'Total Usage', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              stroke={colors.frequency}
              label={{ value: 'Usage Frequency', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="total_usage"
              name="Total Usage"
              fill={colors.usage}
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
            <Bar
              yAxisId="right"
              dataKey="usage_frequency"
              name="Usage Frequency"
              fill={colors.frequency}
              radius={[4, 4, 0, 0]}
              maxBarSize={50}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center p-4">No usage data available</div>
      )}
    </div>
  );
};

export default TopUsedPartsChart; 