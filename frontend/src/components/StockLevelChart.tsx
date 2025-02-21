import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Part } from '../types';

interface StockLevelChartProps {
  data: Part[];
}

const StockLevelChart: React.FC<StockLevelChartProps> = ({ data }) => {
  const calculateStockLevels = (parts: Part[]) => {
    const levels = {
      healthy: 0,
      low: 0,
      critical: 0,
      outOfStock: 0
    };

    parts.forEach(part => {
      if (part.quantity === 0) {
        levels.outOfStock++;
      } else if (part.quantity <= part.minimum_quantity * 0.25) {
        levels.critical++;
      } else if (part.quantity < part.minimum_quantity) {
        levels.low++;
      } else {
        levels.healthy++;
      }
    });

    return [
      { name: 'Healthy Stock', value: levels.healthy, color: '#4caf50' },
      { name: 'Low Stock', value: levels.low, color: '#ff9800' },
      { name: 'Critical Stock', value: levels.critical, color: '#f44336' },
      { name: 'Out of Stock', value: levels.outOfStock, color: '#9e9e9e' }
    ];
  };

  const chartData = calculateStockLevels(data);

  return (
    <div style={{ width: '100%', height: 400 }}>
      {data.length > 0 ? (
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, value }) => `${name}: ${value}`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="text-center p-4">No data available</div>
      )}
    </div>
  );
};

export default StockLevelChart; 