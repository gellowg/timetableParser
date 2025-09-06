const fs = require('fs');
const path = require('path');

console.log('Build script running...');
console.log('Current directory:', process.cwd());
console.log('Contents:', fs.readdirSync(process.cwd()));

// Ensure public directory exists
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory...');
  fs.mkdirSync(publicDir, { recursive: true });
}

// List all files in the project
function listFiles(dir, prefix = '') {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      console.log(`${prefix}${file}/`);
      listFiles(filePath, prefix + '  ');
    } else {
      console.log(`${prefix}${file}`);
    }
  });
}

console.log('Project structure:');
listFiles(process.cwd());

console.log('Build script completed.');
