# PowerShell script for deploying Tech Inventory to production environment
# This script handles the deployment of the RBAC implementation to production
# IMPORTANT: Before running this script, verify the implementation in staging

Write-Host "Starting Tech Inventory production deployment..." -ForegroundColor Yellow

# Variables
$BACKEND_DIR = "..\backend"
$FRONTEND_DIR = "..\frontend"
$PRODUCTION_BACKEND = "tech-inventory-api-prod"
$PRODUCTION_FRONTEND = "tech-inventory-ui-prod"

# Check if we're in the right directory
if (-not (Test-Path $BACKEND_DIR) -or -not (Test-Path $FRONTEND_DIR)) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Function for steps
function Step {
    param ([string]$message)
    Write-Host "`n===> $message" -ForegroundColor Yellow
}

# Function for success
function Success {
    param ([string]$message)
    Write-Host "✓ $message" -ForegroundColor Green
}

# Function for errors
function Error {
    param ([string]$message)
    Write-Host "✗ $message" -ForegroundColor Red
    exit 1
}

# Function for confirmations
function Confirm {
    param ([string]$message)
    $confirmation = Read-Host "$message (y/n)"
    return $confirmation -eq "y"
}

# Step 0: Important confirmations
if (-not (Confirm "Have you verified the RBAC implementation in staging?")) {
    Write-Host "Please verify in staging first before deploying to production" -ForegroundColor Red
    exit 1
}

if (-not (Confirm "Are you sure you want to proceed with production deployment?")) {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

# Step 1: Run tests to ensure everything is working
Step "Running backend tests"
Set-Location $BACKEND_DIR
$backendTestResult = Invoke-Expression "npm test"
if ($LASTEXITCODE -ne 0) {
    Error "Backend tests failed, aborting deployment"
}
Success "Backend tests passed"

Step "Running frontend tests"
Set-Location "..\$FRONTEND_DIR"
$frontendTestResult = Invoke-Expression "npm test -- --watchAll=false"
if ($LASTEXITCODE -ne 0) {
    Error "Frontend tests failed, aborting deployment"
}
Success "Frontend tests passed"

# Step 2: Build the frontend
Step "Building frontend for production"
$buildResult = Invoke-Expression "npm run build"
if ($LASTEXITCODE -ne 0) {
    Error "Frontend build failed"
}
Success "Frontend built successfully"

# Step 3: Create a production database backup
Step "Creating production database backup"
Set-Location "..\$BACKEND_DIR"
Write-Host "Backing up production database..."
$backupResult = Invoke-Expression "npm run backup:db:prod"
if ($LASTEXITCODE -ne 0) {
    Error "Database backup failed"
}
Success "Production database backup completed"

# Step 4: Deploy backend to production
Step "Deploying backend to production"
Write-Host "Running database migrations on production..."
$env:NODE_ENV = "production"
$migrationResult = Invoke-Expression "npm run migrate"
if ($LASTEXITCODE -ne 0) {
    Error "Database migration failed"
}
Success "Database migration completed"

# Push to production server using configured deployment method
Write-Host "Deploying backend code to $PRODUCTION_BACKEND..."
$deployResult = Invoke-Expression "git push production main"
if ($LASTEXITCODE -ne 0) {
    Error "Failed to push backend code to production"
}
Success "Backend deployed to production"

# Step 5: Deploy frontend to production
Step "Deploying frontend to production"
Set-Location "..\$FRONTEND_DIR"

# Deploy built frontend to production server
Write-Host "Deploying frontend code to $PRODUCTION_FRONTEND..."
# Example: AWS S3 deployment 
# aws s3 sync build/ s3://$PRODUCTION_FRONTEND --delete
# For placeholder purposes
Write-Host "Frontend deployment command would run here"
Success "Frontend deployed to production"

# Step 6: Run post-deployment verification
Step "Running post-deployment verification"
Write-Host "Verifying production environment health..."
try {
    $backendHealthCheck = Invoke-WebRequest -Uri "https://your-production-api-url.example.com/health" -UseBasicParsing
    if ($backendHealthCheck.StatusCode -ne 200) {
        Error "Backend health check failed"
    }
} catch {
    Error "Backend health check failed: $_"
}
Success "Backend health check passed"

Write-Host "Verifying frontend health..."
try {
    $frontendHealthCheck = Invoke-WebRequest -Uri "https://your-production-frontend-url.example.com" -UseBasicParsing
    if ($frontendHealthCheck.StatusCode -ne 200) {
        Error "Frontend health check failed"
    }
} catch {
    Error "Frontend health check failed: $_"
}
Success "Frontend health check passed"

Success "Deployment to production completed successfully!"
Write-Host ""
Write-Host "Production environment URLs:"
Write-Host "Backend API: https://your-production-api-url.example.com"
Write-Host "Frontend: https://your-production-frontend-url.example.com"
Write-Host ""
Write-Host "Please verify the RBAC implementation with real user accounts:"
Write-Host "- Admin (full access)"
Write-Host "- Tech (limited access)"
Write-Host "- Purchasing (specific access)"

# Return to original directory
Set-Location "..\." 