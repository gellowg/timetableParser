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
  var options = {
    'method': 'GET',
    'url': `https://api.go4schools.com/web/stars/v1/timetable/student/academic-years/2025/school-id/209/user-type/1/student-id/${req.headers.student_id}/from-date/Mon,%2016%20Sep%202024%2000:00:00%20GMT/to-date/Sun,%2022%20Sep%202024%2023:59:59%20GMT`,
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

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});