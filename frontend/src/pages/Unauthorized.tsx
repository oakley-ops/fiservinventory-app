import React from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Button, 
  Box 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Block as BlockIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const goBack = () => {
    navigate('/');
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8, mb: 4 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          backgroundColor: '#f9f9f9'
        }}
      >
        <BlockIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
        
        <Typography variant="h4" color="error" gutterBottom align="center">
          Access Denied
        </Typography>
        
        <Typography variant="body1" paragraph align="center">
          {user ? (
            <>
              You don't have permission to access this page.
              <Box component="span" sx={{ display: 'block', mt: 1 }}>
                Your current role is: <strong>{user.role}</strong>
              </Box>
            </>
          ) : (
            'You need to be logged in to access this page.'
          )}
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          onClick={goBack} 
          sx={{ mt: 2 }}
        >
          Return to Dashboard
        </Button>
      </Paper>
    </Container>
  );
};

export default Unauthorized; 