import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [preferences] = useState([
    'academic', 'sports', 'cultural', 'technology', 'workshops', 'social'
  ]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/events');
      const data = await response.json();
      const formattedEvents = data.map(event => ({
        id: event._id,
        title: event.title,
        start: new Date(event.date),
        end: new Date(event.date),
      }));
      console.log('Formatted events:', formattedEvents);
      setEvents(formattedEvents);
      setFilteredEvents(formattedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleFilterChange = (pref) => {
    let newPreferences;
    if (selectedPreferences.includes(pref)) {
      newPreferences = selectedPreferences.filter(p => p !== pref);
    } else {
      newPreferences = [...selectedPreferences, pref];
    }
    setSelectedPreferences(newPreferences);

    if (newPreferences.length === 0) {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(event => 
        newPreferences.includes(event.category.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  };

  return (
    <div className="calendar-container">
      <div className="page-header">
        <h1>Evently Calendar</h1>
        <p>View all upcoming events in calendar format</p>
      </div>

      <div className="content-container">
        <div className="preference-filters">
          {preferences.map(pref => (
            <label key={pref} className="checkbox-label">
              <input 
                type="checkbox"
                checked={selectedPreferences.includes(pref)}
                onChange={() => handleFilterChange(pref)}
              />
              <span className="capitalize">{pref}</span>
            </label>
          ))}
        </div>

        {events.length === 0 ? (
          <div>Loading events...</div>
        ) : (
          <div className="calendar-grid">
            <Calendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600, margin: '20px' }}
              views={['month', 'week', 'day']}
              defaultView="month"
              onSelectEvent={(event) => console.log('Selected event:', event)}
              popup
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CalendarView; 