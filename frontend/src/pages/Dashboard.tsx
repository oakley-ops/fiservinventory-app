import React from 'react';
import PartQuantityChart from '../components/PartQuantityChart';
import LowStockReport from '../components/LowStockReport';
import { Container } from 'react-bootstrap';

const Dashboard: React.FC = () => {
  return (
    <Container fluid className="px-4 py-3">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2">Dashboard</h1>
        </div>
      </div>
      
      <div className="row g-4">
        {/* Low Stock Report */}
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body p-0">
              <LowStockReport />
            </div>
          </div>
        </div>
        
        {/* Part Quantities Chart */}
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="h5 mb-4">Part Quantities</h2>
              <PartQuantityChart />
            </div>
          </div>
        </div>
      </div>
      {/* ... other dashboard content */}
    </Container>
  );
};

export default Dashboard;