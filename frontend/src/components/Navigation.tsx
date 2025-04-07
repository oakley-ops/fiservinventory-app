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
  Tooltip
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
  BarChart,
  People
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

const Navigation: React.FC<NavigationProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, hasPermission } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const muiTheme = useTheme();
  // Use a larger breakpoint (lg instead of md) to ensure hamburger appears in split screen
  const isCompactView = useMediaQuery(muiTheme.breakpoints.down('lg'));

  // Define navigation items with permission requirements
  const navigationItems: NavigationItem[] = [
    { path: '/', label: 'DASHBOARD', icon: <Dashboard /> },
    { path: '/parts', label: 'PARTS', icon: <Inventory /> },
    { path: '/machines', label: 'MACHINES', icon: <Build />, requiredPermission: 'CAN_VIEW_ALL' },
    { path: '/transactions', label: 'TRANSACTIONS', icon: <SwapHoriz />, requiredPermission: 'CAN_VIEW_TRANSACTIONS' },
    { path: '/purchase-orders', label: 'PURCHASE ORDERS', icon: <ShoppingCart />, requiredPermission: 'CAN_MANAGE_PURCHASE_ORDERS' }
  ];

  // Add User Management for admins only
  if (hasPermission('CAN_MANAGE_USERS')) {
    navigationItems.push({ 
      path: '/users', 
      label: 'USER MANAGEMENT', 
      icon: <People />, 
      requiredPermission: 'CAN_MANAGE_USERS' 
    });
  }

  // Filter navigation items based on user permissions
  const filteredNavigationItems = navigationItems.filter(item => {
    // If the item doesn't require a specific permission, show it to everyone
    if (!item.requiredPermission) {
      return true;
    }
    // Otherwise, check if the user has the required permission
    return hasPermission(item.requiredPermission);
  });

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
          {user?.name || 'User'} {user?.role && `(${user.role.toUpperCase()})`}
        </Typography>
      </Box>
      <Divider />
      <List>
        {filteredNavigationItems.map(({ path, label, icon }) => (
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
                {filteredNavigationItems.map(({ path, label }) => (
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
              <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
                {user?.role && (
                  <Tooltip title={`Role: ${user.role.toUpperCase()}`}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'white',
                        backgroundColor: FISERV_ORANGE,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        marginRight: 2,
                        fontWeight: 'bold'
                      }}
                    >
                      {user.role.toUpperCase()}
                    </Typography>
                  </Tooltip>
                )}
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
