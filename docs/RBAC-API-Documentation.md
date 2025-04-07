# RBAC API Documentation

This document provides detailed information about the Role-Based Access Control (RBAC) implementation in the Tech Inventory API. It covers authentication, authorization, and how permissions are applied to different endpoints.

## Authentication

### JWT Authentication

The Tech Inventory API uses JSON Web Tokens (JWT) for authentication. Each token includes information about the user's role, which is used for authorization decisions.

#### Token Structure

```json
{
  "id": 123,
  "username": "user.example",
  "role": "tech",
  "iat": 1625097600,
  "exp": 1625184000
}
```

Key fields:
- `id`: User's unique identifier
- `username`: User's login name
- `role`: User's assigned role (admin, tech, purchasing)
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp

### Authentication Endpoints

#### Login

```
POST /api/v1/users/login
```

**Request Body**:
```json
{
  "username": "user.example",
  "password": "password123"
}
```

**Response (200 OK)**:
```json
{
  "user": {
    "id": 123,
    "username": "user.example",
    "email": "user@example.com",
    "role": "tech"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Register

```
POST /api/v1/users/register
```

**Request Body**:
```json
{
  "username": "newuser",
  "password": "password123",
  "email": "newuser@example.com",
  "role": "tech"
}
```

**Response (201 Created)**:
```json
{
  "user": {
    "id": 124,
    "username": "newuser",
    "email": "newuser@example.com",
    "role": "tech"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Note**: Only admin users can specify a role other than the default. If a non-admin tries to create a user with a specific role, the API will reject the request with a 403 Forbidden response.

#### Verify Token

```
GET /api/v1/users/verify-token
```

**Headers**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK)**:
```json
{
  "id": 123,
  "username": "user.example",
  "email": "user@example.com",
  "role": "tech"
}
```

## Authorization

### Middleware

The API uses two key middleware components for authorization:

1. `authMiddleware.js` - Verifies the JWT token and attaches user info to the request
2. `roleMiddleware.js` - Checks if the user's role is allowed to access the endpoint

### Role-Based Access

Each endpoint is protected with specific role requirements. The following roles are available:

| Role | Description |
|------|-------------|
| admin | Full access to all API endpoints |
| tech | Access to parts inventory and machine maintenance |
| purchasing | Access to purchase orders and supplier management |

## API Endpoints

### Parts Management

| Endpoint | Method | Required Roles | Description |
|----------|--------|---------------|-------------|
| `/api/v1/parts` | GET | admin, tech, purchasing | List all parts |
| `/api/v1/parts` | POST | admin | Create a new part |
| `/api/v1/parts/:id` | GET | admin, tech, purchasing | Get part details |
| `/api/v1/parts/:id` | PUT | admin, tech | Update part information |
| `/api/v1/parts/:id` | DELETE | admin | Delete a part |
| `/api/v1/parts/low-stock` | GET | admin, tech, purchasing | Get parts with low stock |

### Purchase Orders

| Endpoint | Method | Required Roles | Description |
|----------|--------|---------------|-------------|
| `/api/v1/purchase-orders` | GET | admin, purchasing | List all purchase orders |
| `/api/v1/purchase-orders` | POST | admin, purchasing | Create a new purchase order |
| `/api/v1/purchase-orders/:id` | GET | admin, purchasing | Get purchase order details |
| `/api/v1/purchase-orders/:id` | PUT | admin, purchasing | Update purchase order |
| `/api/v1/purchase-orders/:id` | DELETE | admin | Delete a purchase order |
| `/api/v1/purchase-orders/:id/status` | PUT | admin, purchasing | Update order status |

### Users Management

| Endpoint | Method | Required Roles | Description |
|----------|--------|---------------|-------------|
| `/api/v1/users` | GET | admin | List all users |
| `/api/v1/users/:id` | GET | admin | Get user details |
| `/api/v1/users/:id` | PUT | admin | Update user information |
| `/api/v1/users/:id` | DELETE | admin | Delete a user |
| `/api/v1/users/:id/role` | PUT | admin | Update user role |

### Machines Management

| Endpoint | Method | Required Roles | Description |
|----------|--------|---------------|-------------|
| `/api/v1/machines` | GET | admin, tech | List all machines |
| `/api/v1/machines` | POST | admin | Create a new machine |
| `/api/v1/machines/:id` | GET | admin, tech | Get machine details |
| `/api/v1/machines/:id` | PUT | admin, tech | Update machine information |
| `/api/v1/machines/:id` | DELETE | admin | Delete a machine |
| `/api/v1/machines/:id/parts` | GET | admin, tech | Get parts installed in a machine |
| `/api/v1/machines/:id/parts` | POST | admin, tech | Add part to a machine |

### Transactions

| Endpoint | Method | Required Roles | Description |
|----------|--------|---------------|-------------|
| `/api/v1/transactions` | GET | admin, purchasing | List all transactions |
| `/api/v1/transactions` | POST | admin, tech | Create a new transaction |
| `/api/v1/transactions/:id` | GET | admin, purchasing | Get transaction details |
| `/api/v1/transactions/report` | GET | admin, purchasing | Get transaction reports |

### Suppliers

| Endpoint | Method | Required Roles | Description |
|----------|--------|---------------|-------------|
| `/api/v1/suppliers` | GET | admin, purchasing | List all suppliers |
| `/api/v1/suppliers` | POST | admin, purchasing | Create a new supplier |
| `/api/v1/suppliers/:id` | GET | admin, purchasing | Get supplier details |
| `/api/v1/suppliers/:id` | PUT | admin, purchasing | Update supplier information |
| `/api/v1/suppliers/:id` | DELETE | admin | Delete a supplier |

### Reports

| Endpoint | Method | Required Roles | Description |
|----------|--------|---------------|-------------|
| `/api/v1/reports/low-stock` | GET | admin, tech, purchasing | Get low stock report |
| `/api/v1/reports/purchase-history` | GET | admin, purchasing | Get purchase history report |
| `/api/v1/reports/usage` | GET | admin, tech | Get parts usage report |

## Error Responses

### Authentication Errors

**401 Unauthorized**
```json
{
  "error": "Access denied. No token provided or invalid format."
}
```

```json
{
  "error": "Invalid token."
}
```

```json
{
  "error": "Token expired. Please login again."
}
```

### Authorization Errors

**403 Forbidden**
```json
{
  "error": "Forbidden. You do not have permission to access this resource."
}
```

## Testing RBAC

To test the RBAC implementation, you can use the following approach:

1. Log in with different user roles to obtain tokens
2. Use these tokens to access various endpoints
3. Verify that endpoints return the expected response based on the user's role

Example using curl:

```bash
# Login as admin
curl -X POST http://localhost:4000/api/v1/users/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin_password"}'

# Use the token to access a protected endpoint
curl -X GET http://localhost:4000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Integration with Frontend

The frontend application uses the JWT token to:

1. Store authentication state
2. Determine which UI elements to display
3. Control navigation to protected routes

When a user logs in, the token is stored in local storage and included with all subsequent API requests. The frontend application uses the user's role to conditionally render UI components and restrict access to certain pages. 