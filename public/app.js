// Global variables to store the date range
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
    document.getElementById('dateRangeDisplay').textContent = `${startDate} to ${endDate}`;
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
    errorDiv.innerHTML = `<strong>Error:</strong> ${message}${details ? '<br><small>' + details + '</small>' : ''}`;
    errorDiv.style.display = 'block';
    document.getElementById('success').style.display = 'none';
}

function showSuccess(message) {
    const successDiv = document.getElementById('success');
    successDiv.innerHTML = `<strong>Success:</strong> ${message}`;
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
        method: 'GET',
        headers: {
            'Authorization': bearer_token,
            'student_id': student_id,
            'start_date': start_date,
            'end_date': end_date
        }
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
        method: 'GET',
        headers: {
            'Authorization': bearer_token,
            'student_id': student_id,
            'start_date': startDate,
            'end_date': endDate
        }
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
        showError("No timetable events found", "No classes were found for the selected date range. This might be because:\n• The date range is outside the academic year\n• There are no classes scheduled\n• Your timetable hasn't been published yet");
        return;
    }
    
    const calendarEvents = timetable.map((event, index) => {
        console.log(`Processing event ${index}:`, event);
        
        // Generate a unique UID for each event
        const uid = `event-${index}@example.com`;
        const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        if (!event.subject_name) {
            console.warn(`Event ${index} has no subject_name, skipping`);
            return ""
        }
        
        const eventString = `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
SUMMARY:${event.subject_name || 'No Subject'}
DTSTART:${formatDate(event.date)}
DTEND:${mergeDateAndTime(event.date, event.end_time)}
LOCATION:${event.room_list || 'No Room'}
DESCRIPTION:${event.teacher_list ? Object.values(event.teacher_list).join(', ') : 'No Teacher'}
END:VEVENT`;
        
        console.log(`Generated event string for ${event.subject_name}:`, eventString);
        return eventString;
    }).filter(event => event !== "").join('\r\n'); // Filter out empty events and ensure CRLF line endings

    console.log("All calendar events:", calendarEvents);

    const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
${calendarEvents}
END:VCALENDAR`.trim(); // Trim to remove any extra newlines

    console.log("Final calendar data:", calendarData);

    const blob = new Blob([calendarData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Timetable_${academicYear}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess(`Calendar downloaded successfully! ${timetable.length} events added to your calendar.`);
}

function formatDate(dateTime) {
    console.log(dateTime);
    const date = new Date(dateTime);
    console.log(date)
    console.log(date.toISOString())
    return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

function mergeDateAndTime(date, time) {
  // Combine date with start time and end time
  const datetime = new Date(date);
  datetime.setHours(parseInt(time.split(":")[0]), parseInt(time.split(":")[1]))
  return `${datetime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}