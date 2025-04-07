/**
 * RBAC Implementation Verification Script
 * 
 * This script checks if all necessary files for the RBAC implementation are in place.
 * Run this script before deployment to ensure all components are ready.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Define the root directory
const rootDir = path.join(__dirname, '..');

// Define expected files and directories
const expectedFiles = [
  // Backend middleware files
  'backend/src/middleware/roleMiddleware.js',
  'backend/src/middleware/authMiddleware.js',
  'backend/src/middleware/auth.js',
  'backend/src/middleware/authenticateToken.js',
  
  // Controller files
  'backend/src/controllers/AuthController.js',
  
  // Test files
  'backend/src/middleware/__tests__/roleMiddleware.test.js',
  'backend/src/middleware/__tests__/authMiddleware.test.js',
  
  // Environment configuration
  'backend/.env.staging',
  'backend/.env.production',
  
  // Deployment scripts
  'scripts/deploy-staging.sh',
  'scripts/deploy-staging.ps1',
  'scripts/deploy-production.sh',
  'scripts/deploy-production.ps1',
  'backend/scripts/backup-database.js',
  'backend/scripts/restore-database.js',
  
  // Documentation
  'docs/RBAC-API-Documentation.md',
  'docs/RBAC-Developer-Guide.md',
  'docs/User-Role-Capabilities.md',
  'docs/RBAC-Deployment-Checklist.md',
  'docs/RBAC-Staging-Deployment-Guide.md',
  'docs/RBAC-Production-Deployment-Guide.md',
  'docs/RBAC-User-Training-Guide.md',
  'docs/RBAC-Implementation-Final-Report.md',
  'RBAC-Implementation-Progress.md'
];

// Check for frontend files
// Note: These paths may need to be adjusted based on your project structure
const frontendFilesToCheck = [
  'frontend/src/utils/permissions.js',
  'frontend/src/contexts/AuthContext.tsx',
  'frontend/src/components/ProtectedRoute.tsx',
  'frontend/src/components/Unauthorized.tsx',
  'frontend/src/components/TransactionHistory.tsx',
  'frontend/src/components/MachineList.tsx',
  'frontend/src/components/PurchaseOrderList.tsx'
];

console.log('======================================================');
console.log('RBAC Implementation Verification');
console.log('======================================================');

// Check if files exist
let missingFiles = [];
let existingFiles = [];

expectedFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    existingFiles.push(file);
  } else {
    missingFiles.push(file);
  }
});

frontendFilesToCheck.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    existingFiles.push(file);
  } else {
    console.log(`Note: Frontend file ${file} not found, but may exist with a different name or path.`);
  }
});

// Print results
console.log('\n1. File Check');
console.log('======================================================');
console.log(`Total files checked: ${expectedFiles.length + frontendFilesToCheck.length}`);
console.log(`Files found: ${existingFiles.length}`);
console.log(`Files missing: ${missingFiles.length}`);

if (missingFiles.length > 0) {
  console.log('\nMissing files:');
  missingFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
}

// Check if scripts are executable (on Unix-based systems)
console.log('\n2. Script Permissions Check');
console.log('======================================================');
const isWindows = process.platform === 'win32';

if (isWindows) {
  console.log('Running on Windows - skipping executable permission check.');
} else {
  const shellScripts = [
    'scripts/deploy-staging.sh',
    'scripts/deploy-production.sh'
  ];
  
  let nonExecutableScripts = [];
  
  shellScripts.forEach(script => {
    const scriptPath = path.join(rootDir, script);
    if (fs.existsSync(scriptPath)) {
      try {
        const stats = fs.statSync(scriptPath);
        const isExecutable = !!(stats.mode & 0o111); // Check if executable bit is set
        
        if (!isExecutable) {
          nonExecutableScripts.push(script);
        }
      } catch (error) {
        console.error(`Error checking permissions for ${script}: ${error.message}`);
      }
    }
  });
  
  if (nonExecutableScripts.length > 0) {
    console.log('The following scripts need executable permissions:');
    nonExecutableScripts.forEach(script => {
      console.log(`  - ${script}`);
    });
    console.log('\nYou can fix this by running:');
    console.log(`  chmod +x ${nonExecutableScripts.join(' ')}`);
  } else {
    console.log('All shell scripts have executable permissions.');
  }
}

// Check environment configuration
console.log('\n3. Environment Configuration Check');
console.log('======================================================');

const requiredEnvVars = [
  'JWT_SECRET',
  'DB_USER',
  'DB_HOST',
  'DB_NAME',
  'DB_PASSWORD',
  'DB_PORT',
  'CORS_ORIGIN'
];

const environmentFiles = [
  { file: 'backend/.env.staging', env: 'Staging' },
  { file: 'backend/.env.production', env: 'Production' }
];

environmentFiles.forEach(({ file, env }) => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`\nChecking ${env} environment configuration:`);
    
    const envContent = fs.readFileSync(filePath, 'utf8');
    const missingVars = [];
    
    requiredEnvVars.forEach(envVar => {
      if (!envContent.includes(`${envVar}=`)) {
        missingVars.push(envVar);
      }
    });
    
    if (missingVars.length === 0) {
      console.log(`✓ All required environment variables present in ${env} configuration.`);
    } else {
      console.log(`⚠ Missing environment variables in ${env} configuration:`);
      missingVars.forEach(envVar => {
        console.log(`  - ${envVar}`);
      });
    }
  } else {
    console.log(`⚠ ${env} environment configuration file not found.`);
  }
});

// Final summary
console.log('\n======================================================');
console.log('RBAC Implementation Verification Summary');
console.log('======================================================');

// Frontend files are just checked with a note, they don't count as missing
if (missingFiles.length === 0) {
  console.log('✅ All required files for RBAC implementation are in place.');
  console.log('✅ Ready for deployment!');
} else {
  console.log('⚠ Some required files are missing. Please address the issues above before deployment.');
}

console.log('\nFor detailed deployment instructions, refer to:');
console.log('- docs/RBAC-Staging-Deployment-Guide.md (for staging)');
console.log('- docs/RBAC-Production-Deployment-Guide.md (for production)');
console.log('======================================================'); 