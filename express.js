const express = require('express');
const cors = require('cors');
const request = require('request');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const path = require('path');
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
if (isProduction) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
} else {
  // In development, completely disable helmet to avoid any issues
  console.log('Development mode: Security headers disabled');
}

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Compression middleware
app.use(compression());

// Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN === '*' ? true : process.env.CORS_ORIGIN?.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Explicit route for app.js to ensure it works in production - MUST come before static middleware
app.get('/app.js', (req, res) => {
  console.log('Explicit route for app.js called');
  
  // Always serve the embedded content in production to guarantee it works
  console.log('Serving embedded JavaScript content for production');
  const embeddedContent = `// Global variables to store the date range
let startDate, endDate, academicYear;

// Set default dates when page loads
document.addEventListener('DOMContentLoaded', function() {
    setAcademicYearRange();
    loadSavedCredentials();
    updateAcademicYearDisplay();
});

function setAcademicYearRange() {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    
    // Set start date to today
    startDate = formatDateForInput(today);
    
    // Determine the correct academic year end date
    let endYear, endMonth, endDay;
    
    if (currentMonth >= 7) { // August (7) or later
        // We're in the second half of the academic year, end date should be next year
        endYear = currentYear + 1;
        endMonth = 7; // August
        endDay = 1;
        academicYear = endYear; // Academic year matches the end year
    } else {
        // We're in the first half of the academic year, end date should be this year
        endYear = currentYear;
        endMonth = 7; // August
        endDay = 1;
        academicYear = endYear; // Academic year matches the end year
    }
    
    const endDateObj = new Date(endYear, endMonth, endDay);
    endDate = formatDateForInput(endDateObj);
    
    console.log('Date range set:', { startDate, endDate, currentMonth, endYear, academicYear });
}

function updateAcademicYearDisplay() {
    document.getElementById('academicYearDisplay').textContent = academicYear;
    document.getElementById('dateRangeDisplay').textContent = \`\${startDate} to \${endDate}\`;
}

function loadSavedCredentials() {
    const savedStudentId = localStorage.getItem('timetable_student_id');
    const savedBearerToken = localStorage.getItem('timetable_bearer_token');
    
    if (savedStudentId) {
        document.getElementById('student_id').value = savedStudentId;
    }
    if (savedBearerToken) {
        document.getElementById('bearer').value = savedBearerToken;
    }
}

function saveCredentials() {
    const studentId = document.getElementById('student_id').value;
    const bearerToken = document.getElementById('bearer').value;
    
    if (studentId) {
        localStorage.setItem('timetable_student_id', studentId);
    }
    if (bearerToken) {
        localStorage.setItem('timetable_bearer_token', bearerToken);
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('success').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showProgress(percent, text) {
    document.getElementById('progressContainer').style.display = 'block';
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('progressText').textContent = text;
}

function hideProgress() {
    document.getElementById('progressContainer').style.display = 'none';
}

function showError(message, details = '') {
    const errorDiv = document.getElementById('error');
    errorDiv.innerHTML = \`<strong>Error:</strong> \${message}\${details ? '<br><small>' + details + '</small>' : ''}\`;
    errorDiv.style.display = 'block';
    document.getElementById('success').style.display = 'none';
}

function showSuccess(message) {
    const successDiv = document.getElementById('success');
    successDiv.innerHTML = \`<strong>Success:</strong> \${message}\`;
    successDiv.style.display = 'block';
    successDiv.classList.add('success-animation');
    document.getElementById('error').style.display = 'none';
    
    // Remove animation class after animation completes
    setTimeout(() => {
        successDiv.classList.remove('success-animation');
    }, 600);
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

// Event Listeners
document.getElementById('downloadCalendar').addEventListener('click', function() {
    downloadCalendar();
});

document.getElementById('testConnection').addEventListener('click', function() {
    testConnection();
});

function downloadCalendar() {
    const student_id = document.getElementById('student_id').value;
    const bearer_token = document.getElementById('bearer').value;
    
    // Use the global date variables (automatically set)
    const start_date = startDate;
    const end_date = endDate;
    
    console.log("Download button pressed");
    console.log("Request parameters:", { student_id, bearer_token, start_date, end_date });
    
    if (!student_id || !bearer_token) {
        showError('Please enter both Student ID and Bearer Token', 'Both fields are required to download your timetable.');
        return;
    }
    
    // Save credentials for next time
    saveCredentials();
    
    showLoading();
    hideProgress();
    
    fetch('/getTTData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            student_id: student_id,
            bearer_token: bearer_token,
            start_date: start_date,
            end_date: end_date
        })
    })
        .then(response => {
            console.log("API Response status:", response.status);
            if (!response.ok) {
                return response.text().then(text => {
                    console.error("API Error:", response.statusText, text);
                    let errorMessage = 'Failed to fetch timetable data';
                    let errorDetails = '';
                    
                    if (response.status === 400) {
                        errorMessage = 'Invalid request parameters';
                        errorDetails = 'Please check your Student ID and Bearer Token are correct.';
                    } else if (response.status === 401) {
                        errorMessage = 'Authentication failed';
                        errorDetails = 'Your Bearer Token may be invalid or expired. Please check your credentials.';
                    } else if (response.status === 404) {
                        errorMessage = 'Student not found';
                        errorDetails = 'The Student ID you entered was not found. Please verify it is correct.';
                    } else if (response.status >= 500) {
                        errorMessage = 'Server error';
                        errorDetails = 'The school server is experiencing issues. Please try again later.';
                    }
                    
                    return Promise.reject(new Error(errorMessage + ' - ' + errorDetails));
                });
            }
            return response
        })
        .then(response => response.json())
        .then(data => {
            console.log("API Response data:", data);
            console.log("Timetable data:", data.student_timetable);
            
            hideLoading();
            showProgress(50, 'Generating calendar file...');
            
            setTimeout(() => {
                generateCalendarFile(data.student_timetable);
                showProgress(100, 'Calendar ready!');
                setTimeout(() => {
                    hideProgress();
                }, 1000);
            }, 500);
        })
        .catch(error => {
            console.error("Fetch error:", error);
            hideLoading();
            hideProgress();
            showError(error.message.split(' - ')[0], error.message.split(' - ')[1] || '');
        });
}

function testConnection() {
    const student_id = document.getElementById('student_id').value;
    const bearer_token = document.getElementById('bearer').value;
    
    if (!student_id || !bearer_token) {
        showError('Please enter both Student ID and Bearer Token', 'Both fields are required to test the connection.');
        return;
    }
    
    showLoading();
    document.getElementById('loading').querySelector('p').textContent = 'Testing connection...';
    
    fetch('/getTTData', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            student_id: student_id,
            bearer_token: bearer_token,
            start_date: startDate,
            end_date: endDate
        })
    })
        .then(response => {
            hideLoading();
            if (response.ok) {
                showSuccess('Connection successful! Your credentials are valid.');
                saveCredentials();
            } else {
                let errorMessage = 'Connection failed';
                if (response.status === 401) {
                    errorMessage = 'Invalid Bearer Token';
                } else if (response.status === 404) {
                    errorMessage = 'Student ID not found';
                }
                showError(errorMessage, 'Please check your credentials and try again.');
            }
        })
        .catch(error => {
            hideLoading();
            showError('Connection failed', 'Unable to reach the server. Please check your internet connection.');
        });
}

function flashError(error) {
    console.log(error);
    showError(error.message);
}

function flashSuccesss(message) {
    console.log(message);
    showSuccess(message);
}

function generateCalendarFile(timetable) {
    console.log("Generating calendar file with timetable:", timetable);
    
    if (!timetable || !Array.isArray(timetable)) {
        console.error("Invalid timetable data:", timetable);
        showError("Invalid timetable data received", "The server returned unexpected data. Please try again.");
        return;
    }
    
    if (timetable.length === 0) {
        console.warn("Empty timetable array");
        showError("No timetable events found", "No classes were found for the selected date range. This might be because:\\n• The date range is outside the academic year\\n• There are no classes scheduled\\n• Your timetable hasn't been published yet");
        return;
    }
    
    const calendarEvents = timetable.map((event, index) => {
        console.log(\`Processing event \${index}:\`, event);
        
        // Generate a unique UID for each event
        const uid = \`event-\${index}@example.com\`;
        const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        if (!event.subject_name) {
            console.warn(\`Event \${index} has no subject_name, skipping\`);
            return ""
        }
        
        const eventString = \`BEGIN:VEVENT
UID:\${uid}
DTSTAMP:\${dtstamp}
SUMMARY:\${event.subject_name || 'No Subject'}
DTSTART:\${formatDate(event.date)}
DTEND:\${mergeDateAndTime(event.date, event.end_time)}
LOCATION:\${event.room_list || 'No Room'}
DESCRIPTION:\${event.teacher_list ? Object.values(event.teacher_list).join(', ') : 'No Teacher'}
END:VEVENT\`;
        
        console.log(\`Generated event string for \${event.subject_name}:\`, eventString);
        return eventString;
    }).filter(event => event !== "").join('\\r\\n'); // Filter out empty events and ensure CRLF line endings

    console.log("All calendar events:", calendarEvents);

    const calendarData = \`BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
\${calendarEvents}
END:VCALENDAR\`.trim(); // Trim to remove any extra newlines

    console.log("Final calendar data:", calendarData);

    const blob = new Blob([calendarData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`Timetable_\${academicYear}.ics\`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(\`Calendar downloaded successfully! \${timetable.length} events added to your calendar.\`);
}

function formatDate(dateTime) {
    console.log(dateTime);
    const date = new Date(dateTime);
    console.log(date)
    console.log(date.toISOString())
    return \`\${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\`;
}

function mergeDateAndTime(date, time) {
  // Combine date with start time and end time
  const datetime = new Date(date);
  datetime.setHours(parseInt(time.split(":")[0]), parseInt(time.split(":")[1]))
  return \`\${datetime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z\`;
}`;
  
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Served-From', 'embedded-content');
  return res.send(embeddedContent);
});

// Static files middleware with proper headers - AFTER explicit routes
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    console.log('Serving static file:', filePath);
    // Ensure static files are served with proper content type
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
    // Remove nosniff header for static files to allow proper MIME type detection
    res.removeHeader('X-Content-Type-Options');
  },
  fallthrough: true // Allow fallthrough to next middleware if file not found
}));

// Middleware to handle protocol consistency
app.use((req, res, next) => {
  // Ensure we're not forcing HTTPS in development
  if (!isProduction && req.header('x-forwarded-proto') === 'https') {
    return res.redirect(`http://${req.header('host')}${req.url}`);
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/', (req, res) => {
  try {
    console.log('Rendering index page...');
    res.render('index');
  } catch (error) {
    console.error('Error rendering index:', error);
    res.status(500).json({ error: 'Failed to render page', details: error.message });
  }
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Input validation middleware
const validateTimetableRequest = [
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

// Validation rules
const timetableValidation = [
  body('student_id')
    .notEmpty()
    .withMessage('Student ID is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Student ID must be between 1 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Student ID contains invalid characters'),
  
  body('bearer_token')
    .notEmpty()
    .withMessage('Bearer token is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Bearer token must be between 10 and 500 characters'),
  
  body('start_date')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('end_date')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_date)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

app.post('/getTTData', timetableValidation, validateTimetableRequest, (req, res) => {
  try {
    const { student_id, bearer_token, start_date, end_date } = req.body;
    
    // Additional validation
    if (!student_id || !bearer_token || !start_date || !end_date) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide student_id, bearer_token, start_date, and end_date'
      });
    }
  
    // Calculate academic year from start date
    const startDateObj = new Date(start_date);
    const currentYear = startDateObj.getFullYear();
    const currentMonth = startDateObj.getMonth() + 1; // getMonth() returns 0-11, so add 1
    const academicYear = currentMonth >= 9 ? currentYear + 1 : currentYear; // Academic year starts in September, use next year
    
    // Use the provided dates directly
    const blockStart = new Date(start_date);
    const blockEnd = new Date(end_date);
  
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
    console.log(`Selected Start Date: ${start_date}`);
    console.log(`Selected End Date: ${end_date}`);
    console.log(`Academic Year: ${academicYear}`);
    console.log(`Block Start: ${blockStart.toDateString()}`);
    console.log(`Block End: ${blockEnd.toDateString()}`);
    console.log(`From Date: ${fromDate}`);
    console.log(`To Date: ${toDate}`);
    
    const options = {
      'method': 'GET',
      'url': `${process.env.API_BASE_URL || 'https://api.go4schools.com'}/web/stars/v1/timetable/student/academic-years/${academicYear}/school-id/${process.env.SCHOOL_ID || 209}/user-type/1/student-id/${student_id}/from-date/${fromDate}/to-date/${toDate}?caching=true`,
      'headers': {
        'Authorization': `Bearer ${bearer_token}`,
        'User-Agent': 'TimetableApp/1.0'
      },
      'timeout': 30000 // 30 second timeout
    };
    
    request(options, function (error, response) {
      if (error) {
        console.error('Request error:', error);
        return res.status(500).json({
          error: 'API request failed',
          message: 'Unable to connect to the timetable service. Please try again later.'
        });
      }
      
      console.log('API Response Status:', response.statusCode);
      
      if (response.statusCode !== 200) {
        console.error('API Error - Status:', response.statusCode);
        let errorMessage = 'API returned an error';
        
        if (response.statusCode === 401) {
          errorMessage = 'Invalid credentials. Please check your Student ID and Bearer Token.';
        } else if (response.statusCode === 404) {
          errorMessage = 'Student not found. Please verify your Student ID.';
        } else if (response.statusCode === 429) {
          errorMessage = 'Too many requests. Please wait before trying again.';
        } else if (response.statusCode >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        return res.status(response.statusCode).json({
          error: 'API Error',
          message: errorMessage,
          statusCode: response.statusCode
        });
      }
      
      try {
        const parsedData = JSON.parse(response.body);
        console.log('Parsed API data:', parsedData);
        console.log('Student timetable data:', parsedData.student_timetable);
        console.log('Number of timetable events:', parsedData.student_timetable ? parsedData.student_timetable.length : 'undefined');
        res.json(parsedData);
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError);
        res.status(500).json({
          error: 'Invalid response format',
          message: 'The timetable service returned invalid data. Please try again later.'
        });
      }
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// Catch-all handler for missing routes
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (isProduction) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      details: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Public directory: ${path.join(__dirname, 'public')}`);
  console.log(`App.js exists: ${require('fs').existsSync(path.join(__dirname, 'public', 'app.js'))}`);
});