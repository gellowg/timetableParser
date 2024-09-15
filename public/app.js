document.getElementById('downloadCalendar').addEventListener('click', function() {
    const student_id = document.getElementById('student_id').value;
    const bearer_token = document.getElementById('bearer').value;
    console.log("Pressed")
    fetch('/getTTData', {
        method: 'GET',
        headers: {
            'Authorization': bearer_token,
            'student_id': student_id
        }
    }) // Replace with your API endpoint
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => Promise.reject(new Error(response.statusText+" "+text)));
            }
            return response
        })
        .then(response => response.json())
        .then(data => generateCalendarFile(data.student_timetable))
        .catch(error => flashError(error));

});

function flashError(error) {
    console.log(error);
    document.getElementById('error').innerHTML = error.message;
}

function flashSuccesss(message) {
    console.log(message);
    document.getElementById('success').innerHTML = message;
}

function generateCalendarFile(timetable) {
    const calendarEvents = timetable.map((event, index) => {
        // Generate a unique UID for each event
        const uid = `event-${index}@example.com`;
        const dtstamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        if (!event.subject_name) {
            return ""
        }
        return `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
SUMMARY:${event.subject_name || 'No Subject'}
DTSTART:${formatDate(event.date)}
DTEND:${mergeDateAndTime(event.date, event.end_time)}
LOCATION:${event.room_list || 'No Room'}
RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=52
DESCRIPTION:${event.teacher_list ? Object.values(event.teacher_list).join(', ') : 'No Teacher'}
END:VEVENT`;
    }).join('\r\n'); // Ensure CRLF line endings

    const calendarData = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
${calendarEvents}
END:VCALENDAR`.trim(); // Trim to remove any extra newlines

    const blob = new Blob([calendarData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Timetable.ics';
    a.click();
    URL.revokeObjectURL(url);
    flashSuccesss("Successfully downloaded");
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