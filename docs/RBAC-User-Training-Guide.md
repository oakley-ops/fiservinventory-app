# Role-Based Access Control User Training Guide

This guide will help you understand the new role-based access control system implemented in the Tech Inventory application.

## Introduction

The Tech Inventory system now uses a role-based access control (RBAC) system to ensure users have access to the functionality they need while maintaining security and separation of duties.

### What is RBAC?

Role-based access control is a security approach that restricts system access to authorized users based on their assigned roles. With RBAC:

- Access decisions are based on the roles users have
- Users are assigned roles based on their job functions
- Permissions are grouped by common responsibilities

## Your User Role

In the Tech Inventory system, you will be assigned one of the following roles:

### Admin Role

**Access level**: Full system access

If you're an administrator, you can:
- Create, view, edit, and delete all resources
- Manage user accounts and permissions
- Access all reports and dashboard features
- Configure system settings
- Perform all actions available to other roles

### Tech Role

**Access level**: Technical functions

If you're a technical user, you can:
- View and search parts inventory
- Add parts to machines
- Record parts usage
- View technical specifications
- Access specific reports related to technical operations
- Limited ability to modify inventory data

**Restrictions**:
- Cannot create or manage purchase orders
- Limited access to financial information
- Cannot manage user accounts

### Purchasing Role

**Access level**: Procurement functions

If you're a purchasing user, you can:
- Create and manage purchase orders
- View and manage supplier information
- View parts inventory levels
- Generate and export procurement reports
- Manage receiving and shipping

**Restrictions**:
- Limited access to technical specifications
- Cannot assign parts to machines
- Cannot manage user accounts

## Logging In

When you log in, the system automatically applies permissions based on your assigned role:

1. Navigate to the Tech Inventory login page
2. Enter your username and password
3. Click "Log In"
4. The system will authenticate you and apply appropriate permissions
5. Your dashboard will display only the features you have access to

## Common User Interface Changes

### Navigation Menu

The navigation menu now shows only items you have permission to access:

![Menu comparison showing different views by role](menu_comparison.png)

### Buttons and Actions

Buttons and actions you don't have permission for will either:
- Not appear at all
- Appear in a disabled state
- Display a message when clicked explaining the permission requirement

### Error Messages

If you attempt to access a feature you don't have permission for, you may see:
- "Access denied" messages
- Redirection to an "Unauthorized" page
- Disabled UI elements with tooltips explaining the permission requirement

## Role-Specific Workflows

### For Admin Users

As an admin, you'll notice few changes to your workflow as you have access to all features. New capabilities include:

1. **User Management**
   - Navigate to "Users" in the main menu
   - You can now assign specific roles to users
   - Available roles: Admin, Tech, Purchasing

2. **Audit Logs**
   - New audit logs track permission-related events
   - Access these logs via Reports > Audit Logs

### For Tech Users

Your workflow focuses on inventory and technical operations:

1. **Parts Inventory**
   - View current inventory via "Parts" menu
   - Record parts usage via "Transactions"
   - Note: Some edit functions may be restricted

2. **Machines Management**
   - Access machine details via "Machines" menu
   - Record parts installed in machines
   - Update machine status and information

### For Purchasing Users

Your workflow focuses on procurement activities:

1. **Purchase Orders**
   - Create and manage POs via "Purchase Orders" menu
   - Track order status
   - Receive items into inventory

2. **Supplier Management**
   - Manage supplier information
   - Track supplier performance
   - View supplier-specific reports

## How to Request Additional Access

If you need access to features not included in your current role:

1. Identify the specific feature you need access to
2. Contact your system administrator with:
   - Your username
   - The specific feature or action you need access to
   - Business justification for the access

## Frequently Asked Questions

**Q: How do I know what my current role is?**
A: Your current role is displayed in your user profile. Click on your username in the top-right corner and select "Profile."

**Q: Why can't I see a feature that I previously had access to?**
A: The new RBAC system may have changed your permissions based on your assigned role. Contact your administrator if you believe you should have access to a specific feature.

**Q: What happens if I try to access a feature I don't have permission for?**
A: You'll see an "Access Denied" message explaining that you don't have the required permissions.

**Q: Can I have multiple roles?**
A: Currently, each user is assigned only one role. If you need capabilities from multiple roles, please contact your system administrator.

## Support Resources

If you have questions or issues with the new permissions system:

- **Help Desk**: [Contact Information]
- **System Administrator**: [Contact Information]
- **Training Resources**: [Link to additional training materials]

## Version Information

- System version: 2.0
- RBAC implementation date: [Date]
- Last updated: [Date] 