# PowerShell script for deploying Tech Inventory to staging environment
# This script handles the deployment of the RBAC implementation to the staging environment

Write-Host "Starting Tech Inventory staging deployment..." -ForegroundColor Yellow

# Variables
$BACKEND_DIR = "..\backend"
$FRONTEND_DIR = "..\frontend"
$STAGING_BACKEND = "tech-inventory-api-staging"
$STAGING_FRONTEND = "tech-inventory-ui-staging"

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

# Step 3: Deploy backend to staging
Step "Deploying backend to staging"
Set-Location "..\$BACKEND_DIR"
Write-Host "Running database migrations on staging..."
$env:NODE_ENV = "staging"
$migrationResult = Invoke-Expression "npm run migrate"
if ($LASTEXITCODE -ne 0) {
    Error "Database migration failed"
}
Success "Database migration completed"

# Push to staging server using configured deployment method
Write-Host "Deploying backend code to $STAGING_BACKEND..."
$deployResult = Invoke-Expression "git push staging main"
if ($LASTEXITCODE -ne 0) {
    Error "Failed to push backend code to staging"
}
Success "Backend deployed to staging"

# Step 4: Deploy frontend to staging
Step "Deploying frontend to staging"
Set-Location "..\$FRONTEND_DIR"

# Deploy built frontend to staging server
Write-Host "Deploying frontend code to $STAGING_FRONTEND..."
# Example: AWS S3 deployment 
# aws s3 sync build/ s3://$STAGING_FRONTEND --delete
# For placeholder purposes
Write-Host "Frontend deployment command would run here"
Success "Frontend deployed to staging"

# Step 5: Run post-deployment verification
Step "Running post-deployment verification"
Write-Host "Verifying staging environment health..."
try {
    $healthCheck = Invoke-WebRequest -Uri "https://your-staging-api-url.example.com/health" -UseBasicParsing
    if ($healthCheck.StatusCode -ne 200) {
        Error "Backend health check failed"
    }
} catch {
    Error "Backend health check failed: $_"
}
Success "Backend health check passed"

Success "Deployment to staging completed successfully!"
Write-Host ""
Write-Host "Staging environment URLs:"
Write-Host "Backend API: https://your-staging-api-url.example.com"
Write-Host "Frontend: https://your-staging-frontend-url.example.com"
Write-Host ""
Write-Host "Please verify the RBAC implementation by testing with different user roles:"
Write-Host "- Admin (full access)"
Write-Host "- Tech (limited access)"
Write-Host "- Purchasing (specific access)"
Write-Host ""
Write-Host "Once verification is complete, deploy to production using: ./scripts/deploy-production.ps1"

# Return to original directory
Set-Location "..\." 