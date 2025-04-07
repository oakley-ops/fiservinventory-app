// Add path resolution for backward compatibility
const fs = require('fs');
const path = require('path');

console.log('Starting temporary fix for module resolution...');

const roleMiddlewarePath = path.join(__dirname, 'src', 'middleware', 'roleMiddleware.js');
const targetPath = path.join(__dirname, 'middleware');

// Make sure target directory exists
if (!fs.existsSync(targetPath)) {
  fs.mkdirSync(targetPath, { recursive: true });
  console.log('Created middleware directory');
}

// Copy the file (only if it exists and target doesn't)
if (fs.existsSync(roleMiddlewarePath) && 
    !fs.existsSync(path.join(targetPath, 'roleMiddleware.js'))) {
  fs.copyFileSync(
    roleMiddlewarePath,
    path.join(targetPath, 'roleMiddleware.js')
  );
  console.log('Created roleMiddleware.js in middleware directory for compatibility');
} else if (fs.existsSync(roleMiddlewarePath)) {
  console.log('roleMiddleware.js already exists in target location');
} else {
  console.log('Source roleMiddleware.js not found at: ' + roleMiddlewarePath);
}

// Start the actual app
console.log('Starting main application...');
try {
  require('./index.js');
} catch (error) {
  console.error('Error starting application:', error);
} 