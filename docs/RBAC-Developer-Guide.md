# Role-Based Access Control Developer Guide

This guide explains how the Role-Based Access Control (RBAC) system is implemented in the Tech Inventory application and provides guidelines for extending or modifying it.

## Architecture Overview

The RBAC system consists of several key components:

1. **Backend Middleware** - Validates user authentication and role-based authorization
2. **Permission Definitions** - Central mapping of roles to permissions
3. **Frontend Permission Hooks** - React hooks for checking permissions client-side
4. **UI Components** - Conditional rendering based on permissions

## Backend Implementation

### Middleware Components

Two main middleware components handle authentication and authorization:

1. **Authentication Middleware** (`authMiddleware.js` or `authenticateToken.js`)
   - Verifies the JWT token from the request header
   - Attaches the user object to the request for downstream use

2. **Role Authorization Middleware** (`roleMiddleware.js`)
   - Takes an array of allowed roles
   - Validates if the authenticated user's role matches any allowed role

### Usage in Routes

Here's how to protect an endpoint with RBAC:

```javascript
// Example: Protecting a route with RBAC
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const roleAuthorization = require('../middleware/roleMiddleware');

// Public route - no authentication
router.get('/public', (req, res) => { /* handler */ });

// Protected route - authentication only
router.get('/protected', authenticateToken, (req, res) => { /* handler */ });

// Role-based route - specific roles only
router.post('/admin-only', 
  authenticateToken, 
  roleAuthorization(['admin']), 
  (req, res) => { /* handler */ }
);

// Multiple roles can access this route
router.get('/inventory', 
  authenticateToken, 
  roleAuthorization(['admin', 'purchasing']), 
  (req, res) => { /* handler */ }
);
```

## Frontend Implementation

### Permission Utility

The permission system is defined in `frontend/src/utils/permissions.js`, which maps roles to permissions:

```typescript
// Example from permissions.js
export const rolePermissions = {
  admin: {
    CAN_MANAGE_PARTS: true,
    CAN_MANAGE_MACHINES: true,
    CAN_MANAGE_SUPPLIERS: true,
    CAN_MANAGE_PURCHASE_ORDERS: true,
    // ...more permissions
  },
  tech: {
    CAN_VIEW_PARTS: true,
    CAN_USE_PARTS: true,
    // ...limited permissions
  },
  purchasing: {
    CAN_MANAGE_PARTS: true,
    CAN_MANAGE_SUPPLIERS: true,
    CAN_MANAGE_PURCHASE_ORDERS: true,
    // ...purchasing-specific permissions
  }
};

export function hasPermission(permission, role) {
  if (!role || !rolePermissions[role.toLowerCase()]) return false;
  return !!rolePermissions[role.toLowerCase()][permission];
}
```

### Authentication Context

The `AuthContext` provides authentication state and permission checking to the entire application:

```typescript
// In AuthContext.tsx
const checkPermission = (permission: string): boolean => {
  if (!user || !user.role) return false;
  return hasPermission(permission, user.role);
};

// Context value
<AuthContext.Provider value={{ 
  // ...other auth properties
  hasPermission: checkPermission,
}}>
  {children}
</AuthContext.Provider>
```

### Using Permissions in Components

Use the `useAuth` hook to access permission checking in components:

```tsx
// Example component with permission-based rendering
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const ProductComponent: React.FC = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('CAN_MANAGE_PARTS');
  
  return (
    <div>
      <h2>Product Details</h2>
      
      {/* Only show edit button if user has permission */}
      {canEdit && (
        <button onClick={handleEdit}>Edit Product</button>
      )}
    </div>
  );
};
```

### Protected Routes

Protected routes ensure users can only access authorized pages:

```tsx
// In App.tsx or routing configuration
<Routes>
  <Route path="/login" element={<Login />} />
  
  {/* Public route with fallback for unauthorized users */}
  <Route 
    path="/dashboard" 
    element={
      <ProtectedRoute fallbackToPublic>
        <Dashboard />
      </ProtectedRoute>
    } 
  />
  
  {/* Admin-only route */}
  <Route 
    path="/admin" 
    element={
      <ProtectedRoute requiredPermission="CAN_MANAGE_USERS">
        <AdminPanel />
      </ProtectedRoute>
    } 
  />
</Routes>
```

## Extending the RBAC System

### Adding New Roles

To add a new role:

1. Update the database schema/seed data to include the new role
2. Add the role to the `rolePermissions` object in `permissions.js`
3. Define which permissions the new role should have

### Adding New Permissions

To add a new permission:

1. Define the permission constant in `permissions.js`
2. Add the permission to the relevant roles in the `rolePermissions` object
3. Use the permission check in components and routes that need it

Example of adding a new permission:

```typescript
// 1. Add to rolePermissions
export const rolePermissions = {
  admin: {
    // existing permissions...
    NEW_CUSTOM_PERMISSION: true,
  },
  tech: {
    // existing permissions...
    NEW_CUSTOM_PERMISSION: false,
  },
  // other roles...
};

// 2. Use in a component
const FeatureComponent = () => {
  const { hasPermission } = useAuth();
  const canUseFeature = hasPermission('NEW_CUSTOM_PERMISSION');
  
  return (
    <div>
      {canUseFeature && <NewFeature />}
    </div>
  );
};

// 3. Use in a route (backend)
router.post('/new-feature', 
  authenticateToken, 
  roleAuthorization(['admin']), // Roles that have the permission
  (req, res) => { /* handler */ }
);
```

## Testing RBAC Implementation

### Backend Testing

Use integration tests to verify role-based access:

```javascript
// Example test from role-based-access.test.js
test('admin role should have access to user management endpoints', async () => {
  const response = await request(app)
    .get('/api/users/all')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(response.status).not.toBe(403); // Not forbidden
});

test('tech role should not have access to user management endpoints', async () => {
  const response = await request(app)
    .get('/api/users/all')
    .set('Authorization', `Bearer ${techToken}`);
  expect(response.status).toBe(403); // Forbidden
});
```

### Frontend Testing

Test that UI elements conditionally render based on permissions:

```typescript
// Example test for permission-based UI
test('export button is shown when user has export permission', async () => {
  // Mock auth context with export permission
  const mockUseAuth = {
    hasPermission: jest.fn().mockReturnValue(true)
  };

  jest.spyOn(require('../../contexts/AuthContext'), 'useAuth')
    .mockReturnValue(mockUseAuth);

  render(<TransactionHistory />);
  
  // Export button should be visible
  expect(screen.getByText('Export')).toBeInTheDocument();
});
```

## Best Practices

1. **Centralize Permission Definitions**: Keep all permissions defined in one place to avoid scattering them throughout the code.

2. **Permission Naming**: Use clear, descriptive permission names that follow a consistent pattern (`CAN_VERB_NOUN`).

3. **Granular Permissions**: Define permissions that are specific enough to provide granular control but not so specific that they become unmaintainable.

4. **Default to Denying Access**: Always default to denying access and explicitly grant permissions.

5. **Test Both Frontend and Backend**: Ensure that both UI and API access are properly secured.

6. **Documentation**: Keep the permission documentation up-to-date when adding new features or changing existing ones.

## Troubleshooting

### Common Issues

1. **User Cannot Access a Feature They Should Have Permission For**
   - Check that the user's role is correctly assigned in the database
   - Verify the permission is mapped to the role in `permissions.js`
   - Ensure the route is protected with the correct role middleware

2. **UI Elements Not Displaying as Expected**
   - Check that the component is using `hasPermission` correctly
   - Verify that the permission name matches exactly what's in `permissions.js`
   - Check that the `AuthContext` is properly providing the user's role

3. **JWT Token Issues**
   - Make sure tokens include the user's role
   - Check token expiration times
   - Verify that `authenticateToken` middleware is working as expected 