import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAdmin = user?.role === 'admin';
  const isGuest = user?.role === 'guest';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/dashboard">Fiserv Inventory</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">Dashboard</Nav.Link>
            <Nav.Link as={Link} to="/machines">Machines</Nav.Link>
            <Nav.Link as={Link} to="/parts">Parts</Nav.Link>
            <Nav.Link as={Link} to="/parts-usage">Parts Usage</Nav.Link>
            {!isGuest && (
              <Nav.Link as={Link} to="/assign-part">Assign Parts</Nav.Link>
            )}
            {isAdmin && (
              <>
                <Nav.Link as={Link} to="/import">Import</Nav.Link>
                <Nav.Link as={Link} to="/scanner">Scanner</Nav.Link>
              </>
            )}
          </Nav>
          <Nav>
            <span className="navbar-text me-3">
              Welcome, {user?.username} ({user?.role})
            </span>
            {isAdmin && (
              <Nav.Link as={Link} to="/change-password" className="me-3">
                Change Password
              </Nav.Link>
            )}
            <Button variant="outline-light" onClick={handleLogout}>
              {isGuest ? 'Exit Guest Mode' : 'Logout'}
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Navigation;
