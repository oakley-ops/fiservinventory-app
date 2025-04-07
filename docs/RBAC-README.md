# Role-Based Access Control (RBAC) Implementation

## Overview

This document provides a high-level overview of the Role-Based Access Control (RBAC) implementation in the Tech Inventory System. The RBAC system ensures that users can only access resources and perform actions appropriate to their assigned roles.

## Included Features

- **Role-Based Authentication**: JWT tokens include role information
- **Authorization Middleware**: Backend routes protected by role-specific middleware
- **Permission-Based UI**: Frontend components render conditionally based on permissions
- **Comprehensive Testing**: Backend and frontend tests for RBAC functionality
- **Detailed Documentation**: API docs, user guides, and developer resources
- **Deployment Scripts**: Tools for deploying to staging and production environments

## Role Definitions

The system includes three primary roles:

1. **Admin** - Full access to all features and functionality
   - Can manage users and roles
   - Can perform all data operations (create, read, update, delete)
   - Can access all reports and system settings

2. **Tech** - Technical staff with parts management focus
   - Can view and use parts inventory
   - Can record parts usage
   - Limited ability to modify data
   - Cannot access purchasing features

3. **Purchasing** - Staff responsible for ordering and supplies
   - Can create and manage purchase orders
   - Can view parts inventory and reports
   - Cannot modify technical data
   - Limited administrative functions

## Implementation Details

The RBAC system consists of several key components:

1. **Authentication Middleware** (`authMiddleware.js`)
   - Verifies JWT tokens
   - Extracts user role information
   - Attaches user data to request object

2. **Role Authorization Middleware** (`roleMiddleware.js`)
   - Takes an array of allowed roles
   - Checks if the user's role matches any allowed role
   - Returns appropriate errors for unauthorized access

3. **Frontend Permission Utilities** (`permissions.js`)
   - Defines role-based permissions
   - Provides helper functions for checking permissions
   - Used for conditional UI rendering

## Getting Started

To work with the RBAC system:

1. **For Developers**
   - Review the `RBAC-Developer-Guide.md` for implementation details
   - Check `roleMiddleware.js` and `authMiddleware.js` for middleware logic
   - Refer to test files for examples of correct usage

2. **For Administrators**
   - Review the `User-Role-Capabilities.md` document 
   - Understand the permission matrix for each role
   - Follow `RBAC-Deployment-Checklist.md` for deployment

3. **For Testing**
   - Run backend tests: `cd backend && npm test`
   - Run frontend tests: `cd frontend && npm test`
   - Test with different user roles in staging before production deployment

## Deployment

Use the provided deployment scripts:

- For staging: 
  - Linux/Mac: `./scripts/deploy-staging.sh`
  - Windows: `.\scripts\deploy-staging.ps1`

- For production:
  - Linux/Mac: `./scripts/deploy-production.sh`
  - Windows: `.\scripts\deploy-production.ps1`

Always follow the `RBAC-Deployment-Checklist.md` during deployment.

## Documentation Index

- `RBAC-API-Documentation.md` - Details on API endpoints and permission requirements
- `User-Role-Capabilities.md` - User-focused documentation on role features
- `RBAC-Developer-Guide.md` - Technical details for developers
- `RBAC-Deployment-Checklist.md` - Steps for successful deployment
- `RBAC-Implementation-Progress.md` - History and status of the implementation

## Support and Troubleshooting

For issues related to the RBAC implementation:

1. Check the logs for 401/403 errors
2. Verify JWT token contents and expiration
3. Check that routes are protected with the correct role requirements
4. Review the troubleshooting section in `RBAC-Developer-Guide.md` 