# RBAC Production Deployment Guide

This document provides detailed instructions for deploying the Role-Based Access Control (RBAC) implementation to the production environment, following successful verification in staging.

## Prerequisites

Before beginning the production deployment, ensure the following prerequisites are met:

1. Successful deployment and verification in staging environment
2. Stakeholder approval for production deployment
3. Access to the production environment
4. PostgreSQL client tools installed (for database operations)
5. Git access to the repository with production deployment permissions
6. Production environment credentials
7. Scheduled maintenance window (if required)
8. User notification of potential downtime

## Pre-Deployment Steps

### 1. Final Staging Verification

Conduct a final verification of the staging environment to ensure all features work as expected:

```bash
# Navigate to the staging URL and verify functionality with different user roles
# Check logs for any errors or issues
```

### 2. Notify Users

Send notifications to users about the upcoming deployment:

- Scheduled time and estimated duration
- Expected downtime (if any)
- New features/changes they will experience
- Support contacts during and after deployment

### 3. Review Production Configuration

1. Verify the production environment configuration in `backend/.env.production`:
   - Database connection parameters
   - JWT secret key (ensure it's secure and production-ready)
   - CORS settings
   - Port configurations
   - Log levels (set to appropriate production levels)

2. Ensure the frontend API endpoint is configured to point to the production backend:
   - Check `frontend/.env.production` or equivalent configuration file

### 4. Create Database Backup

```bash
# Navigate to the backend directory
cd backend

# Create a backup of the production database
npm run backup:db:prod
```

This will create a backup in the `backend/backups` directory with a timestamp.

## Deployment Process

### 1. Run Final Tests

```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd ../frontend
npm test -- --watchAll=false
```

Ensure all tests pass before proceeding.

### 2. Build Frontend for Production

```bash
# In the frontend directory
cd frontend
npm run build
```

This creates optimized production build files in the `frontend/build` directory.

### 3. Deploy to Production

#### Windows Environment

```powershell
# From the project root directory
.\scripts\deploy-production.ps1
```

#### Linux/Mac Environment

```bash
# From the project root directory
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

The script will:
- Prompt for confirmation before proceeding
- Run all tests again
- Create a database backup
- Perform database migrations
- Push code to the production server
- Deploy the frontend to the production server

### 4. Verify Deployment

After the deployment script completes, verify the production environment:

1. Access the production frontend URL in a browser
2. Verify the backend health check endpoint is responding:
   ```bash
   curl https://your-production-api-url.example.com/health
   ```
3. Check server logs for any errors:
   ```bash
   # Command will depend on your logging system
   # For example, if using systemd:
   sudo journalctl -u tech-inventory-api -f
   ```

## Post-Deployment Verification

### 1. Verify Authentication

Test login with different user roles:

1. **Admin User**
   - Verify login and access to admin features
   - Verify user management functionality

2. **Tech User**
   - Verify login and appropriate feature access
   - Verify permission restrictions are functioning

3. **Purchasing User**
   - Verify login and appropriate feature access
   - Verify permission restrictions are functioning

### 2. Verify Critical Functionality

Test the following key features with different user roles:

1. **Part Inventory Management**
   - Add/edit/delete parts (admin)
   - View and search parts (all roles with appropriate permissions)

2. **Purchase Order Management**
   - Create purchase orders (admin, purchasing)
   - View and track orders (based on role permissions)

3. **Transaction History**
   - Record transactions (based on role permissions)
   - View transaction history (admin, appropriate roles)

4. **User Management**
   - Create new users (admin only)
   - Modify user roles (admin only)

### 3. Monitoring

Implement or verify monitoring for the following:

1. **Error Rates**
   - Track 401/403 errors to identify potential permission issues
   - Monitor for unexpected authentication failures

2. **Performance Metrics**
   - API response times
   - Database query performance
   - Frontend load times

3. **User Activity**
   - Monitor login successes and failures
   - Track key user actions by role

## Rollback Procedure

If critical issues are discovered, follow this rollback procedure:

1. Assess the severity and impact of the issues
2. Make a go/no-go decision on rollback with stakeholders
3. If rollback is necessary:

   ```bash
   # Stop the production services
   # Command will depend on your deployment setup
   
   # Restore the database from the backup created earlier
   cd backend
   node scripts/restore-database.js ./backups/[backup-file-name].sql production
   
   # Revert to the previous version in the repository
   git checkout [previous-working-commit]
   
   # Re-deploy the previous version
   ```

4. Notify users of the rollback and expected resolution timeline

## Post-Deployment Tasks

### 1. Update Documentation

```bash
# Update the implementation progress document
cd /path/to/fiservinventory-app
# Edit RBAC-Implementation-Progress.md to mark production deployment as complete
```

### 2. Knowledge Transfer

1. Schedule sessions with support teams
2. Review new RBAC features and potential support scenarios
3. Share troubleshooting guides and common solutions

### 3. User Communication

1. Send notification that deployment is complete
2. Provide links to updated documentation
3. Highlight key changes and benefits of the RBAC implementation
4. Provide support contact information

## Success Criteria

The production deployment is considered successful when:

1. All user roles can access their designated features
2. All role-based restrictions work as expected
3. Authentication and token handling work correctly
4. No unexpected errors in logs related to RBAC
5. Application performance meets or exceeds benchmarks
6. User feedback indicates successful understanding and use of the new permissions system

## Support Plan

For post-deployment support:

1. **Immediate Issues (First 24 hours)**
   - Dedicated support team on standby
   - Rapid response to any critical issues
   - Hourly monitoring of error logs and performance metrics

2. **Short Term (First Week)**
   - Daily monitoring of system performance
   - User feedback collection and issue prioritization
   - Regular status updates to stakeholders

3. **Long Term**
   - Regular monitoring of permission-related metrics
   - Scheduled review of RBAC effectiveness
   - Planning for potential improvements

## Contact Information

- **DevOps Team**: [Contact Information]
- **Development Team**: [Contact Information]
- **Product Owner**: [Contact Information]
- **Emergency Contact**: [Contact Information]

## References

- RBAC-API-Documentation.md
- RBAC-Developer-Guide.md
- RBAC-Deployment-Checklist.md
- RBAC-Implementation-Progress.md
- User-Role-Capabilities.md 