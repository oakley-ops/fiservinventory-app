# Role-Based Access Control Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for role-based access control in the Tech Inventory system. This plan follows the successfully completed tests for the role-based authorization middleware.

## Implementation Steps

### Phase 1: Setup and Branch Creation

- [x] Create and run tests for the role middleware
- [x] Update role middleware to support case-insensitive role comparison
- [ ] Create a feature branch for implementation:
  ```bash
  git checkout -b feature/role-based-access-control
  ```

### Phase 2: Backend Implementation

#### 1. Database Schema Updates

- [ ] Verify the `users` table schema supports the required roles:
  ```sql
  ALTER TABLE users
  ALTER COLUMN role TYPE VARCHAR(20),
  ADD CONSTRAINT valid_role CHECK (role IN ('admin', 'tech', 'purchasing'));
  ```

- [ ] Create migration script for existing users:
  ```javascript
  // Set default role for existing users without a role
  await pool.query(`
    UPDATE users 
    SET role = 'tech' 
    WHERE role IS NULL OR role = '';
  `);
  ```

#### 2. Route Protection Implementation

- [ ] Update API routes to use the role-based authorization middleware

  **Parts Routes:**
  ```javascript
  // GET /api/parts - All roles can view parts
  router.get('/api/parts', 
    authMiddleware, 
    roleAuthorization(['admin', 'tech', 'purchasing']), 
    partsController.getParts
  );

  // POST /api/parts - Only admin can create parts
  router.post('/api/parts', 
    authMiddleware, 
    roleAuthorization(['admin']), 
    partsController.createPart
  );

  // DELETE /api/parts/:id - Only admin can delete parts
  router.delete('/api/parts/:id',
    authMiddleware,
    roleAuthorization(['admin']),
    partsController.deletePart
  );

  // POST /api/parts/checkout - Admin and tech can checkout parts
  router.post('/api/parts/checkout',
    authMiddleware,
    roleAuthorization(['admin', 'tech']),
    partsController.checkoutPart
  );
  ```

  **Purchase Order Routes:**
  ```javascript
  // GET /api/purchase-orders - Admin and purchasing can view POs
  router.get('/api/purchase-orders',
    authMiddleware,
    roleAuthorization(['admin', 'purchasing']),
    purchaseOrderController.getPurchaseOrders
  );

  // POST /api/purchase-orders - Admin and purchasing can create POs
  router.post('/api/purchase-orders',
    authMiddleware,
    roleAuthorization(['admin', 'purchasing']),
    purchaseOrderController.createPurchaseOrder
  );
  ```

  **Transaction Routes:**
  ```javascript
  // GET /api/transactions - Admin and purchasing can view transactions
  router.get('/api/transactions',
    authMiddleware,
    roleAuthorization(['admin', 'purchasing']),
    transactionController.getTransactions
  );
  ```

#### 3. Authentication Controller Update

- [ ] Ensure role information is included in JWT tokens and responses

### Phase 3: Frontend Implementation

#### 1. Permission Utility Creation

- [ ] Create a permissions utility file:

```typescript
// src/utils/permissions.ts
export const PERMISSIONS = {
  ADMIN: {
    CAN_VIEW_ALL: true,
    CAN_ADD_PARTS: true,
    CAN_DELETE_PARTS: true,
    CAN_CHECKOUT_PARTS: true,
    CAN_MANAGE_PURCHASE_ORDERS: true,
    CAN_VIEW_TRANSACTIONS: true
  },
  TECH: {
    CAN_VIEW_ALL: false,
    CAN_ADD_PARTS: false,
    CAN_DELETE_PARTS: false, 
    CAN_CHECKOUT_PARTS: true,
    CAN_MANAGE_PURCHASE_ORDERS: false,
    CAN_VIEW_TRANSACTIONS: false
  },
  PURCHASING: {
    CAN_VIEW_ALL: false,
    CAN_ADD_PARTS: false,
    CAN_DELETE_PARTS: false,
    CAN_CHECKOUT_PARTS: false,
    CAN_MANAGE_PURCHASE_ORDERS: true,
    CAN_VIEW_TRANSACTIONS: true
  }
};

export const hasPermission = (userRole, permission) => {
  if (!userRole || !PERMISSIONS[userRole.toUpperCase()]) return false;
  return PERMISSIONS[userRole.toUpperCase()][permission] || false;
};
```

#### 2. Authentication Context Update

- [ ] Update the AuthContext to handle role-based permissions:

```typescript
// src/contexts/AuthContext.tsx
interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

interface AuthContextType {
  // Existing properties
  hasPermission: (permission: string) => boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Existing state and functions
  
  const checkPermission = (permission: string) => {
    if (!user || !user.role) return false;
    return hasPermission(user.role, permission);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      login, 
      logout: handleLogout, 
      loading,
      changePassword,
      hasPermission: checkPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 3. Protected Route Enhancement

- [ ] Update ProtectedRoute component to check for specific permissions:

```typescript
// src/components/ProtectedRoute.tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  const { isAuthenticated, loading, hasPermission } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  // Check for specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

#### 4. App Routing Update

- [ ] Modify App.tsx to implement role-based route protection:

```typescript
// src/App.tsx
<Route
  path="/parts/*"
  element={
    <ProtectedRoute>
      <Navigation>
        <Parts />
      </Navigation>
    </ProtectedRoute>
  }
/>

<Route
  path="/purchase-orders"
  element={
    <ProtectedRoute requiredPermission="CAN_MANAGE_PURCHASE_ORDERS">
      <Navigation>
        <PurchaseOrders />
      </Navigation>
    </ProtectedRoute>
  }
>
  {/* Nested routes */}
</Route>
```

#### 5. Navigation Update

- [ ] Modify Navigation to show only relevant menu items:

```typescript
// src/components/Navigation.tsx
const navigationItems = [
  { path: '/', label: 'DASHBOARD', icon: <Dashboard />, requiredPermission: null }, // Available to all
  { path: '/parts', label: 'PARTS', icon: <Inventory />, requiredPermission: null }, // View only for techs
  { path: '/machines', label: 'MACHINES', icon: <Build />, requiredPermission: 'CAN_VIEW_ALL' },
  { path: '/transactions', label: 'TRANSACTIONS', icon: <SwapHoriz />, requiredPermission: 'CAN_VIEW_TRANSACTIONS' },
  { path: '/purchase-orders', label: 'PURCHASE ORDERS', icon: <ShoppingCart />, requiredPermission: 'CAN_MANAGE_PURCHASE_ORDERS' }
];

// In the component:
const filteredNavigationItems = navigationItems.filter(item => 
  item.requiredPermission === null || hasPermission(user?.role, item.requiredPermission)
);

// Use filteredNavigationItems for rendering
```

#### 6. Component-Level Permission Checks

- [ ] Update UI components to respect permissions:

```tsx
// Example in PartsManagement.tsx
const PartsManagement = () => {
  const { hasPermission } = useAuth();
  
  return (
    <div>
      {/* Only render if user has permission */}
      {hasPermission('CAN_ADD_PARTS') && (
        <Button onClick={handleAddPart}>Add Part</Button>
      )}
      
      {/* Or disable the button */}
      <Button 
        onClick={handleDeletePart} 
        disabled={!hasPermission('CAN_DELETE_PARTS')}
        style={{
          opacity: hasPermission('CAN_DELETE_PARTS') ? 1 : 0.5,
          cursor: hasPermission('CAN_DELETE_PARTS') ? 'pointer' : 'not-allowed'
        }}
      >
        Delete Part
      </Button>
    </div>
  );
};
```

### Phase 4: Testing

#### 1. Backend Testing

- [ ] Run existing unit tests for middleware
- [ ] Run integration tests for API access control
- [ ] Create or update any additional controller tests

#### 2. Frontend Testing

- [ ] Test AuthContext permission functions
- [ ] Test conditional rendering components
- [ ] Test protected routes with different roles

#### 3. Manual Testing

- [ ] Create test users with different roles:
  - Admin user
  - Tech user
  - Purchasing user
- [ ] Verify access to appropriate pages and functions
- [ ] Test edge cases and error handling

### Phase 5: Deployment

#### 1. Prepare for Deployment

- [ ] Review all changes
- [ ] Run all tests
- [ ] Create a pull request for review

#### 2. Staging Deployment

- [ ] Deploy to staging environment
- [ ] Perform comprehensive testing
- [ ] Gather feedback and make adjustments

#### 3. Production Deployment

- [ ] Create migration plan for existing users
- [ ] Schedule deployment during low-traffic period
- [ ] Have rollback plan ready
- [ ] Monitor for issues after deployment

### Phase 6: Documentation and Training

- [ ] Update API documentation with role requirements
- [ ] Create user guides for different roles
- [ ] Document admin procedures for managing user roles

## Progress Tracking

- [ ] Phase 1: Setup and Branch Creation
- [ ] Phase 2: Backend Implementation
- [ ] Phase 3: Frontend Implementation
- [ ] Phase 4: Testing
- [ ] Phase 5: Deployment
- [ ] Phase 6: Documentation and Training

## Additional Notes

- All changes should be thoroughly tested before proceeding to the next step
- Keep team members informed of progress and any issues encountered
- Document any deviations from the original plan 