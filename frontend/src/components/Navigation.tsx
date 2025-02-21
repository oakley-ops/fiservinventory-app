import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  ThemeProvider,
} from '@mui/material';
import { AccountCircle, Logout } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { theme, commonStyles, FISERV_ORANGE } from '../theme';

interface NavigationProps {
  children: React.ReactNode;
}

const navigationItems = [
  { path: '/', label: 'DASHBOARD' },
  { path: '/parts', label: 'PARTS' },
  { path: '/machines', label: 'MACHINES' },
  { path: '/transactions', label: 'TRANSACTIONS' }
];

const Navigation: React.FC<NavigationProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getButtonStyles = (path: string) => ({
    ...commonStyles.navButton,
    backgroundColor: location.pathname === path ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
  });

  return (
    <ThemeProvider theme={theme}>
      <AppBar 
        position="fixed" 
        color="primary"
        sx={{
          margin: 0,
          padding: 0,
          width: '100vw',
          left: 0,
          top: 0,
          right: 0
        }}
      >
        <Container 
          maxWidth={false}
          disableGutters
          sx={{
            margin: 0,
            padding: 0,
            width: '100%',
            maxWidth: 'none'
          }}
        >
          <Toolbar
            disableGutters
            sx={{
              padding: '0 16px',
              minHeight: '64px',
              width: '100%'
            }}
          >
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                fontWeight: 'bold',
                letterSpacing: '0.5px',
                color: FISERV_ORANGE,
                fontSize: '1.75rem'
              }}
            >
              Tech Inventory
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {navigationItems.map(({ path, label }) => (
                <Button
                  key={path}
                  component={Link}
                  to={path}
                  sx={{
                    ...getButtonStyles(path),
                    fontWeight: 700
                  }}
                >
                  {label}
                </Button>
              ))}
            </Box>
            <Box sx={{ ml: 2 }}>
              <IconButton
                size="large"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ color: FISERV_ORANGE }}
              >
                <AccountCircle />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                <MenuItem disabled>{user?.name || 'User'}</MenuItem>
                <MenuItem onClick={handleLogout}>
                  <Logout fontSize="small" sx={{ mr: 1 }} />
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 8, pt: 2 }}>
        {children}
      </Container>
    </ThemeProvider>
  );
};

export default Navigation;
