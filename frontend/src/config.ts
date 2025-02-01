// Get the hostname dynamically
const getApiUrl = () => {
  // Check if we're running in development
  if (process.env.NODE_ENV === 'development') {
    // Use the current hostname (works for both localhost and IP address)
    const hostname = window.location.hostname;
    return `http://${hostname}:3001`;
  }
  // For production, you would return your production API URL
  return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

export const API_URL = getApiUrl();
