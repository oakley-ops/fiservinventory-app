# User Role Capabilities

This document explains the different roles in the Tech Inventory system and what each role can do.

## Overview

The Tech Inventory system implements role-based access control (RBAC) to ensure that users only have access to the functionality they need to perform their job. There are three main roles in the system:

1. **Admin**
2. **Tech**
3. **Purchasing**

Each role has different permissions and capabilities as detailed below.

## Admin Role

The Admin role has full access to all system functionality.

### What an Admin Can Do:

- **Parts Management**
  - View all parts in inventory
  - Add new parts
  - Edit existing parts
  - Delete parts
  - Record part usage
  - Restock parts
  - View part usage history
  - Export parts data

- **Machine Management**
  - View all machines
  - Add new machines
  - Edit machine details
  - Delete machines
  - View machine costs
  - Associate parts with machines

- **Supplier Management**
  - View all suppliers
  - Add new suppliers
  - Edit supplier details
  - Delete suppliers
  - View parts supplied by specific suppliers

- **Purchase Order Management**
  - View all purchase orders
  - Create new purchase orders
  - Edit purchase orders
  - Delete purchase orders
  - Approve purchase orders
  - Mark purchase orders as received
  - Export purchase order data

- **User Management**
  - View all users
  - Create new user accounts
  - Edit user details
  - Delete users
  - Assign roles to users

- **Reports**
  - Access all reports
  - Export report data

## Tech Role

The Tech role is designed for technicians who need to use parts but don't manage inventory or purchasing.

### What a Tech Can Do:

- **Parts Management**
  - View all parts in inventory
  - Record part usage (checkout parts for use)
  - View basic part details

- **Machine Management**
  - View all machines
  - View machine details
  - View parts associated with machines

- **Limited Access**
  - Cannot add/edit/delete parts
  - Cannot manage suppliers
  - Cannot create or manage purchase orders
  - Cannot access reports
  - Cannot manage users

## Purchasing Role

The Purchasing role is designed for staff responsible for inventory management and purchasing.

### What a Purchasing User Can Do:

- **Parts Management**
  - View all parts in inventory
  - Add new parts
  - Edit existing parts
  - Restock parts
  - View part usage history
  - Export parts data

- **Machine Management**
  - View all machines
  - View machine costs
  - Cannot add/edit/delete machines

- **Supplier Management**
  - View all suppliers
  - Add new suppliers
  - Edit supplier details
  - Delete suppliers
  - View parts supplied by specific suppliers

- **Purchase Order Management**
  - View all purchase orders
  - Create new purchase orders
  - Edit purchase orders
  - Mark purchase orders as received
  - Export purchase order data
  - Cannot delete purchase orders
  - Cannot approve purchase orders (admin only)

- **Reports**
  - Access low stock reports
  - Export report data

- **Limited Access**
  - Cannot manage users
  - Cannot delete parts
  - Cannot manage machines

## Accessing Features

### UI Components and Permissions

The user interface adapts based on your role. If you don't see certain buttons or features, it's likely because your role doesn't have permission to use those features.

Examples:
- Only Admin and Purchasing roles will see the "Export" button on reports and data tables
- Only Admin will see the "User Management" section in the navigation
- Only Admin and Purchasing will see supplier management options

### Error Messages

If you attempt to access a feature you don't have permission for, you'll see one of the following:
- A notification indicating you don't have permission
- Redirection to an "Unauthorized" page
- Missing UI elements (buttons or links not visible)

## Requesting Additional Access

If you need access to features not available with your current role, please contact your system administrator. Only administrators can change user roles in the system. 