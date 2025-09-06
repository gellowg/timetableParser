const express = require('express');
const cors = require('cors');
const request = require('request');
const app = express();
const path = require('path');
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the public directory
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);
app.use(express.static(publicPath));

// Add a specific route for app.js to debug
app.get('/app.js', (req, res) => {
  console.log('Request for app.js received');
  res.sendFile(path.join(publicPath, 'app.js'));
});

app.use(cors());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.get('/', (req, res) => {
  res.render('index');
})

// Test route to verify static files are working
app.get('/test-static', (req, res) => {
  res.json({
    publicPath: publicPath,
    appJsExists: require('fs').existsSync(path.join(publicPath, 'app.js')),
    filesInPublic: require('fs').readdirSync(publicPath)
  });
})

app.get('/getTTData', (req, res) => {
  if ((req.headers.authorization === "") || (req.headers.student_id === "")){
    res.status(400).send('Please fill in fields.');
  }
  
  const startDate = req.headers.start_date;
  const endDate = req.headers.end_date;
  
  if (!startDate || !endDate) {
    res.status(400).send('Please select both start and end dates.');
  }
  
  // Calculate academic year from start date
  const startDateObj = new Date(startDate);
  const currentYear = startDateObj.getFullYear();
  const currentMonth = startDateObj.getMonth() + 1; // getMonth() returns 0-11, so add 1
  const academicYear = currentMonth >= 9 ? currentYear + 1 : currentYear; // Academic year starts in September, use next year
  
  // Use the provided dates directly
  const blockStart = new Date(startDate);
  const blockEnd = new Date(endDate);
  
  // Format dates for the API
  const formatDateForAPI = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName},%20${day}%20${month}%20${year}`;
  };
  
  const fromDate = formatDateForAPI(blockStart) + '%2000:00:00%20GMT';
  const toDate = formatDateForAPI(blockEnd) + '%2023:59:59%20GMT';
  
  // Debug logging
  console.log(`Selected Start Date: ${startDate}`);
  console.log(`Selected End Date: ${endDate}`);
  console.log(`Academic Year: ${academicYear}`);
  console.log(`Block Start: ${blockStart.toDateString()}`);
  console.log(`Block End: ${blockEnd.toDateString()}`);
  console.log(`From Date: ${fromDate}`);
  console.log(`To Date: ${toDate}`);
  
  var options = {
    'method': 'GET',
    'url': `https://api.go4schools.com/web/stars/v1/timetable/student/academic-years/${academicYear}/school-id/209/user-type/1/student-id/${req.headers.student_id}/from-date/${fromDate}/to-date/${toDate}?caching=true`,
    'headers': {
      'Authorization': `Bearer ${req.headers.authorization}`
    }
  };
  request(options, function (error, response) {
    if (error) {
      console.log('Request error:', error);
      res.status(500).send('API request failed');
      } else {
        console.log('API Response Status:', response.statusCode);
        console.log('API Response Body:', response.body);
        
        if (response.statusCode !== 200) {
          console.log('API Error - Status:', response.statusCode);
          res.status(response.statusCode).send('API returned error: ' + response.statusCode);
        } else {
          try {
            const parsedData = JSON.parse(response.body);
            console.log('Parsed API data:', parsedData);
            console.log('Student timetable data:', parsedData.student_timetable);
            console.log('Number of timetable events:', parsedData.student_timetable ? parsedData.student_timetable.length : 'undefined');
            res.json(parsedData);
          } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            res.status(500).send('Failed to parse API response');
          }
        }
      }
  })
});

// Catch-all handler for missing routes
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.url}`);
  res.status(404).send('Route not found');
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Public directory exists: ${require('fs').existsSync(publicPath)}`);
  console.log(`app.js exists: ${require('fs').existsSync(path.join(publicPath, 'app.js'))}`);
});