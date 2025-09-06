const express = require('express');
const cors = require('cors');
const request = require('request');
const app = express();
const path = require('path');
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

app.get('/', (req, res) => {
  res.render('index');
})

app.get('/getTTData', (req, res) => {
  if ((req.headers.authorization === "") || (req.headers.student_id === "")){
    res.status(400).send('Please fill in fields.');
  }
  
  // Calculate current two-week block
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const isEvenWeek = currentWeek % 2 === 0;
  
  // Find the Monday of the current two-week block
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1); // Get Monday of current week
  
  // If we're in an odd week, go back one week to get the start of the two-week block
  if (!isEvenWeek) {
    monday.setDate(monday.getDate() - 7);
  }
  
  // Calculate Friday of the second week
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 13); // 2 weeks - 1 day = 13 days
  
  // Format dates for the API
  const fromDate = formatDateForAPI(monday);
  const toDate = formatDateForAPI(friday);
  
  var options = {
    'method': 'GET',
    'url': `https://api.go4schools.com/web/stars/v1/timetable/student/academic-years/2025/school-id/209/user-type/1/student-id/${req.headers.student_id}/from-date/${fromDate}/to-date/${toDate}`,
    'headers': {
      'Authorization': `Bearer ${req.headers.authorization}`
    }
  };
  request(options, function (error, response) {
    if (error) {
      console.log(error)
    } else {
    console.log(response.body);
    }
  }).pipe(res)
});

// Helper function to get week number
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to format date for API
function formatDateForAPI(date) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const time = date.getDay() === 5 ? '23:59:59' : '00:00:00'; // Friday gets end of day, Monday gets start of day
  
  return `${dayName},%20${day}%20${month}%20${year}%20${time}%20GMT`;
}

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});