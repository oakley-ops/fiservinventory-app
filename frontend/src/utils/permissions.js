/**
 * Permission utility for role-based access control
 * Defines permissions for different user roles and provides helper functions
 */

// Define role-based permissions
const PERMISSIONS = {
  ADMIN: {
    CAN_VIEW_ALL: true,
    CAN_MANAGE_USERS: true,
    CAN_MANAGE_PARTS: true,
    CAN_RESTOCK_PARTS: true,
    CAN_MANAGE_PURCHASE_ORDERS: true,
    CAN_VIEW_TRANSACTIONS: true,
    CAN_VIEW_COSTS: true,
    CAN_EXPORT_DATA: true,
    CAN_IMPORT_DATA: true
  },
  TECH: {
    CAN_VIEW_ALL: false,
    CAN_MANAGE_USERS: false,
    CAN_MANAGE_PARTS: false,
    CAN_RESTOCK_PARTS: true, // Techs can restock and use parts
    CAN_MANAGE_PURCHASE_ORDERS: false,
    CAN_VIEW_TRANSACTIONS: false,
    CAN_VIEW_COSTS: false,
    CAN_EXPORT_DATA: false,
    CAN_IMPORT_DATA: false
  },
  PURCHASING: {
    CAN_VIEW_ALL: false,
    CAN_MANAGE_USERS: false,
    CAN_MANAGE_PARTS: true, // Purchasing can manage parts
    CAN_RESTOCK_PARTS: true,
    CAN_MANAGE_PURCHASE_ORDERS: true,
    CAN_VIEW_TRANSACTIONS: true,
    CAN_VIEW_COSTS: true,
    CAN_EXPORT_DATA: true,
    CAN_IMPORT_DATA: true
  }
};

/**
 * Checks if a user has a specific permission
 * @param {string} permission - The permission to check
 * @param {string} role - The user's role
 * @returns {boolean} - Whether the user has the permission
 */
export const hasPermission = (permission, role) => {
  if (!role || !PERMISSIONS[role.toUpperCase()]) {
    return false;
  }
  
  return PERMISSIONS[role.toUpperCase()][permission] === true;
};

/**
 * Gets all permissions for a role
 * @param {string} role - The user's role
 * @returns {Object} - An object with all permissions for the role
 */
export const getRolePermissions = (role) => {
  if (!role || !PERMISSIONS[role.toUpperCase()]) {
    return {};
  }
  
  return PERMISSIONS[role.toUpperCase()];
};

/**
 * Checks if a user has any of the specified permissions
 * @param {Array<string>} permissions - Array of permissions to check
 * @param {string} role - The user's role
 * @returns {boolean} - Whether the user has any of the permissions
 */
export const hasAnyPermission = (permissions, role) => {
  if (!role || !PERMISSIONS[role.toUpperCase()]) {
    return false;
  }
  
  return permissions.some(permission => 
    PERMISSIONS[role.toUpperCase()][permission] === true
  );
};

export default {
  hasPermission,
  getRolePermissions,
  hasAnyPermission
}; 