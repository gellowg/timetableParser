const http = require('http');
const fs = require('fs');
const path = require('path');

// Test if the server is running and serving files correctly
const testServer = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/app.js',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ app.js served successfully');
        console.log(`File size: ${data.length} bytes`);
      } else {
        console.log('❌ Failed to serve app.js');
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Problem with request: ${e.message}`);
  });

  req.end();
};

// Test if app.js file exists
const filePath = path.join(__dirname, 'public', 'app.js');
if (fs.existsSync(filePath)) {
  console.log('✅ app.js file exists');
  const stats = fs.statSync(filePath);
  console.log(`File size: ${stats.size} bytes`);
  console.log(`Last modified: ${stats.mtime}`);
} else {
  console.log('❌ app.js file not found');
}

// Test server if it's running
console.log('Testing server...');
testServer();
