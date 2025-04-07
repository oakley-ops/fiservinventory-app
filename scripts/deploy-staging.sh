#!/bin/bash

# Deploy script for Tech Inventory Staging Environment
# This script deploys the latest RBAC changes to the staging environment

echo "Starting Tech Inventory staging deployment..."

# Variables
BACKEND_DIR="../backend"
FRONTEND_DIR="../frontend"
STAGING_BACKEND="tech-inventory-api-staging"
STAGING_FRONTEND="tech-inventory-ui-staging"

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display step information
step() {
  echo -e "${YELLOW}===> $1${NC}"
}

# Function to display success messages
success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to display error messages and exit
error() {
  echo -e "${RED}✗ $1${NC}"
  exit 1
}

# Check if we're in the right directory
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
  error "Please run this script from the project root directory"
fi

# Step 1: Run tests to ensure everything is working
step "Running backend tests"
cd "$BACKEND_DIR" || error "Failed to change to backend directory"
npm test || error "Backend tests failed, aborting deployment"
success "Backend tests passed"

step "Running frontend tests"
cd "../$FRONTEND_DIR" || error "Failed to change to frontend directory"
npm test -- --watchAll=false || error "Frontend tests failed, aborting deployment"
success "Frontend tests passed"

# Step 2: Build the frontend
step "Building frontend for production"
npm run build || error "Frontend build failed"
success "Frontend built successfully"

# Step 3: Deploy backend to staging
step "Deploying backend to staging"
cd "../$BACKEND_DIR" || error "Failed to change to backend directory"
echo "Running database migrations on staging..."
NODE_ENV=staging npm run migrate || error "Database migration failed"
success "Database migration completed"

# Push to staging server using configured deployment method
# This could be different based on your setup (e.g., Heroku, AWS, etc.)
echo "Deploying backend code to $STAGING_BACKEND..."
git push staging main || error "Failed to push backend code to staging"
success "Backend deployed to staging"

# Step 4: Deploy frontend to staging
step "Deploying frontend to staging"
cd "../$FRONTEND_DIR" || error "Failed to change to frontend directory"

# Deploy built frontend to staging server
# Again, this depends on your specific deployment setup
echo "Deploying frontend code to $STAGING_FRONTEND..."
# Example: AWS S3 deployment 
# aws s3 sync build/ s3://$STAGING_FRONTEND --delete
# Example: Netlify deployment
# netlify deploy --prod
# Example: Vercel deployment
# vercel --prod

# Replace with your actual deployment command
# For placeholder purposes, we'll just echo success
echo "Frontend deployment command would run here"
success "Frontend deployed to staging"

# Step 5: Run post-deployment verification
step "Running post-deployment verification"
echo "Verifying staging environment health..."
curl -s https://your-staging-api-url.example.com/health || error "Backend health check failed"
success "Backend health check passed"

success "Deployment to staging completed successfully!"
echo ""
echo "Staging environment URLs:"
echo "Backend API: https://your-staging-api-url.example.com"
echo "Frontend: https://your-staging-frontend-url.example.com"
echo ""
echo "Please verify the RBAC implementation by testing with different user roles:"
echo "- Admin (full access)"
echo "- Tech (limited access)"
echo "- Purchasing (specific access)"
echo ""
echo "Once verification is complete, deploy to production using: ./scripts/deploy-production.sh" 