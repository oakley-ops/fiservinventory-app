import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Transaction {
  transaction_id: number;
  part_id: number;
  type: string;
  quantity: number;
  timestamp: string;
  user_id: number;
}

const Transactions = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await axios.get<Transaction[]>('/api/v1/transactions');
        setTransactions(response.data);
      } catch (error: any) {
        console.error('Error fetching transactions:', error);
        setError(error.response?.data?.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h1>Transactions</h1>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Part ID</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Timestamp</th>
            <th>User ID</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.transaction_id}>
              <td>{transaction.transaction_id}</td>
              <td>{transaction.part_id}</td>
              <td>{transaction.type}</td>
              <td>{transaction.quantity}</td>
              <td>{transaction.timestamp}</td>
              <td>{transaction.user_id}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Transactions;
