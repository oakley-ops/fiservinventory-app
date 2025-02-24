import React, { useEffect, useState } from 'react';
import { Container, Alert, Spinner } from 'react-bootstrap';
import LowStockReport from '../components/LowStockReport';
import StockLevelChart from '../components/StockLevelChart';
import UsageTrendChart from '../components/UsageTrendChart';
import TopUsedPartsChart from '../components/TopUsedPartsChart';
import axiosInstance from '../utils/axios';
import { socket } from '../utils/socket';
import { DashboardData } from '../types';

const Dashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axiosInstance.get<DashboardData>('/api/v1/dashboard');
      console.log('Dashboard data received:', response.data);
      console.log('Usage trends:', response.data.usageTrends);
      console.log('Top used parts:', response.data.topUsedParts);
      setDashboardData(response.data);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Listen for stock updates
    socket.on('stock-update', (data) => {
      console.log('Stock update received:', data);
      fetchDashboardData();
    });

    // Listen for dashboard updates
    socket.on('dashboard-update', () => {
      console.log('Dashboard update received');
      fetchDashboardData();
    });

    return () => {
      socket.off('stock-update');
      socket.off('dashboard-update');
    };
  }, []);

  if (loading) {
    return (
      <Container fluid className="px-4 py-3">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="px-4 py-3">
        <Alert variant="danger">
          {error}
          <div className="mt-2">
            <button 
              className="btn btn-outline-danger" 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchDashboardData();
              }}
            >
              Try Again
            </button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container fluid className="px-4 py-3">
        <Alert variant="warning">No dashboard data available</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="px-4 py-3" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2 mb-4">Inventory Dashboard</h1>
        </div>
      </div>
      
      <div className="row g-4">
        {/* Summary Cards */}
        <div className="col-md-3">
          <div className="card shadow-sm border-0 rounded-3 h-100">
            <div className="card-body d-flex flex-column">
              <h6 className="card-subtitle mb-2 text-muted">Total Parts</h6>
              <p className="card-text display-6 mb-0 mt-auto" data-testid="total-parts">
                {dashboardData?.totalParts || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 rounded-3 h-100">
            <div className="card-body d-flex flex-column">
              <h6 className="card-subtitle mb-2 text-muted">Low Stock Parts</h6>
              <p className="card-text display-6 mb-0 mt-auto text-warning" data-testid="low-stock-count">
                {dashboardData?.lowStockCount || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 rounded-3 h-100">
            <div className="card-body d-flex flex-column">
              <h6 className="card-subtitle mb-2 text-muted">Out of Stock</h6>
              <p className="card-text display-6 mb-0 mt-auto text-danger" data-testid="out-of-stock-count">
                {dashboardData?.outOfStockCount || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card shadow-sm border-0 rounded-3 h-100">
            <div className="card-body d-flex flex-column">
              <h6 className="card-subtitle mb-2 text-muted">Total Machines</h6>
              <p className="card-text display-6 mb-0 mt-auto text-primary">
                {dashboardData?.totalMachines || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Low Stock Report */}
        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4">
              <h5 className="card-title mb-4">Inventory Status Alerts</h5>
              <LowStockReport 
                data={[
                  ...(dashboardData?.lowStockParts || []),
                  ...(dashboardData?.outOfStockParts || [])
                ]} 
              />
            </div>
          </div>
        </div>

        {/* Usage Trends */}
        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4">
              <h5 className="card-title mb-4">Parts Usage Trends (Last 30 Days)</h5>
              <UsageTrendChart data={dashboardData.usageTrends || []} />
            </div>
          </div>
        </div>

        {/* Top Used Parts */}
        <div className="col-md-8">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4">
              <h5 className="card-title mb-4">Most Used Parts (Last 30 Days)</h5>
              <TopUsedPartsChart data={dashboardData.topUsedParts || []} />
            </div>
          </div>
        </div>

        {/* Stock Level Distribution */}
        <div className="col-md-4">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4">
              <h5 className="card-title mb-4">Stock Level Distribution</h5>
              <StockLevelChart data={dashboardData.allParts || []} />
            </div>
          </div>
        </div>

        {/* Recent Usage History */}
        <div className="col-12">
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-body p-4">
              <h5 className="card-title mb-4">Recent Usage History</h5>
              {dashboardData.recentUsageHistory && dashboardData.recentUsageHistory.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Part Name</th>
                        <th>Machine</th>
                        <th>Quantity</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboardData.recentUsageHistory.map((usage, index) => (
                        <tr key={index}>
                          <td>{new Date(usage.date).toLocaleDateString()}</td>
                          <td data-testid={`part-name-${usage.part_name}`}>{usage.part_name}</td>
                          <td data-testid={`machine-name-${usage.machine_name}`}>{usage.machine_name || 'N/A'}</td>
                          <td>
                            <span className={`badge bg-${usage.type === 'restock' ? 'success' : 'danger'}`}>
                              {usage.type === 'restock' ? '+' : '-'}{usage.quantity}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${usage.type === 'restock' ? 'success' : 'secondary'}`}>
                              {usage.type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No usage history found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Dashboard;