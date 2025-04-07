# Role-Based Access Control API Documentation

This document provides information about the role-based access control (RBAC) implementation for the Tech Inventory API.

## Authentication

All protected endpoints require a valid JWT token in the `Authorization` header in the format:

```
Authorization: Bearer <token>
```

### Roles

The system supports the following roles, each with different permissions:

| Role | Description |
|------|-------------|
| `admin` | Full system access |
| `tech` | Limited to part usage, viewing inventory, and machine information |
| `purchasing` | Management of suppliers, purchase orders, and reports |

## API Endpoints

### Parts API

| Endpoint | Method | Required Role(s) | Description |
|----------|--------|-----------------|-------------|
| `/api/parts` | GET | All authenticated users | List all parts |
| `/api/parts` | POST | admin, purchasing | Create a new part |
| `/api/parts/:id` | GET | All authenticated users | Get details of a specific part |
| `/api/parts/:id` | PUT | admin, purchasing | Update a part |
| `/api/parts/:id` | DELETE | admin | Delete a part |
| `/api/parts/checkout` | POST | admin, tech | Record part usage |
| `/api/parts/restock` | POST | admin, purchasing | Restock parts |
| `/api/parts/usage/history` | GET | admin, purchasing | View usage history |

### Machines API

| Endpoint | Method | Required Role(s) | Description |
|----------|--------|-----------------|-------------|
| `/api/machines` | GET | All authenticated users | List all machines |
| `/api/machines` | POST | admin | Create a new machine |
| `/api/machines/:id` | GET | All authenticated users | Get details of a specific machine |
| `/api/machines/:id` | PUT | admin | Update a machine |
| `/api/machines/:id` | DELETE | admin | Delete a machine |
| `/api/machines/:id/parts` | GET | All authenticated users | Get parts associated with a machine |
| `/api/machines/costs` | GET | admin, purchasing | Get machine cost reports |

### Suppliers API

| Endpoint | Method | Required Role(s) | Description |
|----------|--------|-----------------|-------------|
| `/api/suppliers` | GET | admin, purchasing | List all suppliers |
| `/api/suppliers` | POST | admin, purchasing | Create a new supplier |
| `/api/suppliers/:id` | GET | admin, purchasing | Get details of a specific supplier |
| `/api/suppliers/:id` | PUT | admin, purchasing | Update a supplier |
| `/api/suppliers/:id` | DELETE | admin, purchasing | Delete a supplier |
| `/api/suppliers/:id/parts` | GET | admin, purchasing | Get parts supplied by a specific supplier |

### Purchase Orders API

| Endpoint | Method | Required Role(s) | Description |
|----------|--------|-----------------|-------------|
| `/api/purchase-orders` | GET | admin, purchasing | List all purchase orders |
| `/api/purchase-orders` | POST | admin, purchasing | Create a new purchase order |
| `/api/purchase-orders/:id` | GET | admin, purchasing | Get details of a specific purchase order |
| `/api/purchase-orders/:id` | PUT | admin, purchasing | Update a purchase order |
| `/api/purchase-orders/:id` | DELETE | admin, purchasing | Delete a purchase order |
| `/api/purchase-orders/:id/approve` | POST | admin | Approve a purchase order |
| `/api/purchase-orders/:id/receive` | POST | admin, purchasing | Mark a purchase order as received |

### User Management API

| Endpoint | Method | Required Role(s) | Description |
|----------|--------|-----------------|-------------|
| `/api/users/login` | POST | Public | User login |
| `/api/users/register` | POST | admin | Register a new user |
| `/api/users/all` | GET | admin | List all users |
| `/api/users/:id` | GET | admin | Get details of a specific user |
| `/api/users/:id` | PUT | admin | Update a user |
| `/api/users/:id` | DELETE | admin | Delete a user |
| `/api/users/profile` | GET | All authenticated users | Get current user's profile |
| `/api/users/profile` | PUT | All authenticated users | Update current user's profile |

### Reports API

| Endpoint | Method | Required Role(s) | Description |
|----------|--------|-----------------|-------------|
| `/api/reports/low-stock` | GET | admin, purchasing | Get low stock report |

## Frontend Permissions

The frontend uses permission checks to control UI elements. Here are the main permissions:

| Permission | Description | Granted To |
|------------|-------------|------------|
| `CAN_MANAGE_PARTS` | Ability to add, edit, and delete parts | admin, purchasing |
| `CAN_VIEW_TRANSACTIONS` | Ability to view transaction history | admin, purchasing |
| `CAN_MANAGE_MACHINES` | Ability to add, edit, and delete machines | admin |
| `CAN_VIEW_MACHINE_COSTS` | Ability to view machine cost reports | admin, purchasing |
| `CAN_MANAGE_SUPPLIERS` | Ability to manage suppliers | admin, purchasing |
| `CAN_MANAGE_PURCHASE_ORDERS` | Ability to create and manage purchase orders | admin, purchasing |
| `CAN_EXPORT_DATA` | Ability to export data to Excel/CSV | admin, purchasing |
| `CAN_MANAGE_USERS` | Ability to manage user accounts | admin |
| `CAN_CREATE_PURCHASE_ORDERS` | Ability to create purchase orders | admin, purchasing |
| `CAN_DELETE_PURCHASE_ORDERS` | Ability to delete purchase orders | admin |

## Error Handling

When a user attempts to access a resource they don't have permission for, the API returns:

```json
{
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

With HTTP status code 403 (Forbidden).

## Testing RBAC Implementation

To verify RBAC is working correctly:

1. Backend tests: `npm run test:integration` will run integration tests that verify proper access control.
2. Frontend tests: `npm test` inside the frontend directory will run component tests that verify proper UI rendering.

For more information about the RBAC implementation, refer to the developer documentation. 