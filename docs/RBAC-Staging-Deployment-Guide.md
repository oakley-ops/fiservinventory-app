# RBAC Staging Deployment Guide

This document provides detailed instructions for deploying the Role-Based Access Control (RBAC) implementation to the staging environment.

## Prerequisites

Before beginning the deployment, ensure the following prerequisites are met:

1. Access to the staging environment
2. PostgreSQL client tools installed (for database operations)
3. Git access to the repository
4. Necessary credentials for the staging environment
5. Node.js and npm installed

## Pre-Deployment Steps

### 1. Update Local Repository

```bash
# Navigate to your local repository
cd /path/to/fiservinventory-app

# Ensure you're on the correct branch
git checkout main

# Pull the latest changes
git pull origin main
```

### 2. Review Environment Configuration

1. Verify the staging environment configuration in `backend/.env.staging`:
   - Database connection parameters
   - JWT secret key
   - CORS settings
   - Port configurations

2. Ensure the frontend API endpoint is configured to point to the staging backend:
   - Check `frontend/.env.staging` or equivalent configuration file

### 3. Create Database Backup

```bash
# Navigate to the backend directory
cd backend

# Create a backup of the staging database
npm run backup:db:staging
```

This will create a backup in the `backend/backups` directory with a timestamp.

## Deployment Process

### 1. Run Tests

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd ../frontend
npm test -- --watchAll=false
```

Ensure all tests pass before proceeding.

### 2. Build Frontend

```bash
# In the frontend directory
npm run build
```

This creates optimized production build files in the `frontend/build` directory.

### 3. Deploy to Staging

#### Windows Environment

```powershell
# From the project root directory
.\scripts\deploy-staging.ps1
```

#### Linux/Mac Environment

```bash
# From the project root directory
chmod +x scripts/deploy-staging.sh
./scripts/deploy-staging.sh
```

This script will:
- Run tests
- Perform database migrations
- Push code to the staging server
- Deploy the frontend to the staging server

### 4. Verify Deployment

After the deployment script completes, verify the staging environment:

1. Access the staging frontend URL in a browser
2. Verify the backend health check endpoint is responding:
   ```bash
   curl https://your-staging-api-url.example.com/health
   ```

## Post-Deployment Verification

### 1. Verify Authentication

Test login with different user roles:

1. **Admin User**
   - Username: `admin_user`
   - Password: `staging_admin_password`

2. **Tech User**
   - Username: `tech_user`
   - Password: `staging_tech_password`

3. **Purchasing User**
   - Username: `purchasing_user`
   - Password: `staging_purchasing_password`

### 2. Verify Role-Based Access

For each user role, verify access restrictions:

#### Admin User Tests
- Verify access to user management
- Verify ability to create/edit/delete all resources
- Verify access to all reports

#### Tech User Tests
- Verify access to parts inventory
- Verify inability to access purchasing features
- Verify limited administrative capabilities

#### Purchasing User Tests
- Verify access to purchase orders
- Verify access to supplier management
- Verify inability to modify technical configurations

### 3. Test Error Handling

1. **Token Expiration**
   - Modify a token to be expired
   - Verify correct 401 response and error message

2. **Invalid Permissions**
   - Attempt to access restricted endpoints with incorrect role
   - Verify 403 responses are returned correctly

3. **Missing Authentication**
   - Access protected endpoints without authentication
   - Verify correct 401 response

## Rollback Procedure

If critical issues are discovered, follow this rollback procedure:

1. Stop the deployment if still in progress:
   ```bash
   # Press Ctrl+C to stop the deployment script
   ```

2. Restore the database from the backup created earlier:
   ```bash
   cd backend
   node scripts/restore-database.js ./backups/[backup-file-name].sql staging
   ```

3. Revert to the previous version in the repository:
   ```bash
   git checkout [previous-working-commit]
   ```

4. Re-deploy the previous version using the deployment script

## Success Criteria

The staging deployment is considered successful when:

1. All user roles can access their designated features
2. All role-based restrictions work as expected
3. Authentication and token handling work correctly
4. No unexpected errors in logs related to RBAC
5. Application performance remains within acceptable parameters

## Next Steps

After successful verification in staging:

1. Update the RBAC Implementation Progress document to mark staging deployment as complete
2. Conduct a final review with stakeholders
3. Schedule the production deployment
4. Prepare for user training on the new role-based system

## Support

For issues during the staging deployment:

- Contact: [DevOps Team Contact]
- Slack Channel: #tech-inventory-deployment
- Documentation: Refer to `RBAC-Developer-Guide.md` for technical details 