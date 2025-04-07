import React, { useState } from 'react';
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
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { 
  AccountCircle, 
  Logout, 
  Menu as MenuIcon,
  Dashboard,
  Inventory,
  Build,
  SwapHoriz,
  ShoppingCart,
  BarChart
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { theme, commonStyles, FISERV_ORANGE } from '../theme';

// Fiserv blue color
const FISERV_BLUE = '#0066A1';

interface NavigationProps {
  children: React.ReactNode;
}

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  requiredPermission?: string;
}

const navigationItems: NavigationItem[] = [
  { path: '/', label: 'DASHBOARD', icon: <Dashboard /> }, // Available to all roles
  { path: '/parts', label: 'PARTS', icon: <Inventory /> }, // Available to all roles
  { path: '/machines', label: 'MACHINES', icon: <Build />, requiredPermission: 'CAN_VIEW_ALL' }, // Admin only
  { path: '/transactions', label: 'TRANSACTIONS', icon: <SwapHoriz />, requiredPermission: 'CAN_VIEW_TRANSACTIONS' }, // Admin, Purchasing
  { path: '/purchase-orders', label: 'PURCHASE ORDERS', icon: <ShoppingCart />, requiredPermission: 'CAN_MANAGE_PURCHASE_ORDERS' } // Admin, Purchasing
];

const Navigation: React.FC<NavigationProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, hasPermission } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const muiTheme = useTheme();
  // Use a larger breakpoint (lg instead of md) to ensure hamburger appears in split screen
  const isCompactView = useMediaQuery(muiTheme.breakpoints.down('lg'));

  // Filter navigation items based on user permissions
  const getAuthorizedNavItems = () => {
    return navigationItems.filter(item => 
      !item.requiredPermission || hasPermission(item.requiredPermission)
    );
  };

  const authorizedNavItems = getAuthorizedNavItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getButtonStyles = (path: string) => ({
    ...commonStyles.navButton,
    backgroundColor: location.pathname === path ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
  });

  const toggleDrawer = (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' || (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const drawerContent = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={toggleDrawer(false)}
      onKeyDown={toggleDrawer(false)}
    >
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
        <Typography 
          variant="h6" 
          sx={{ 
            color: FISERV_ORANGE, 
            fontWeight: 'bold',
            textDecoration: 'none',
            '&:hover': {
              opacity: 0.9,
              cursor: 'pointer'
            }
          }}
          component={Link}
          to="/"
        >
          Tech Inventory
        </Typography>
        <Typography variant="body2" sx={{ color: 'white' }}>
          {user?.name || user?.username || 'User'} ({user?.role || 'user'})
        </Typography>
      </Box>
      <Divider />
      <List>
        {authorizedNavItems.map(({ path, label, icon }) => (
          <ListItem 
            button 
            key={path} 
            component={Link} 
            to={path}
            selected={location.pathname === path}
            sx={{
              bgcolor: location.pathname === path ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.12)',
              }
            }}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText primary={label} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon><Logout /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </Box>
  );

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
              component={Link}
              to="/"
              sx={{
                flexGrow: 1,
                fontWeight: 'bold',
                letterSpacing: '0.5px',
                color: FISERV_ORANGE,
                fontSize: '1.75rem',
                textDecoration: 'none',
                '&:hover': {
                  color: FISERV_ORANGE,
                  opacity: 0.9,
                  cursor: 'pointer'
                }
              }}
            >
              Tech Inventory
            </Typography>
            
            {isCompactView ? (
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={toggleDrawer(true)}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <Box sx={{ display: 'flex', gap: 2 }}>
                {authorizedNavItems.map(({ path, label }) => (
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
            )}
            
            {!isCompactView && (
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
                  <MenuItem disabled>
                    {(user?.name || user?.username || 'User')} ({user?.role || 'user'})
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <Logout fontSize="small" sx={{ mr: 1 }} />
                    Logout
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawerContent}
      </Drawer>
      
      <Container maxWidth="lg" sx={{ mt: 8, pt: 2 }}>
        {children}
      </Container>
    </ThemeProvider>
  );
};

export default Navigation;
