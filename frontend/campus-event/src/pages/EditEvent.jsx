import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const EditEvent = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/events');
      return;
    }

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          throw new Error('No authentication token found');
        }

        console.log('Fetching event:', eventId);
        const response = await fetch(`http://localhost:5001/api/events/${eventId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        // Log the response details
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        // First get the response as text
        const text = await response.text();
        console.log('Raw response:', text);

        // Try to parse it as JSON
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('JSON parse error:', e);
          throw new Error('Invalid response format from server');
        }

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch event details');
        }

        if (!data || !data.title) {
          throw new Error('Invalid event data received');
        }

        // Format the date
        const formattedDate = data.date ? data.date.split('T')[0] : '';

        setEventData({
          title: data.title || '',
          date: formattedDate,
          time: data.time || '',
          location: data.location || '',
          description: data.description || '',
          category: data.category || '',
          capacity: data.capacity || '',
          isPrivate: Boolean(data.isPrivate),
          registrationDeadline: data.registrationDeadline || ''
        });
      } catch (error) {
        console.error('Error fetching event:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEvent();
    }
  }, [eventId, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/api/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        throw new Error('Failed to update event');
      }

      alert('Event updated successfully!');
      navigate('/events');
    } catch (error) {
      setError('Failed to update event');
      alert(error.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Loading event details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Event</h2>
        <p>{error}</p>
        <div className="button-group">
          <button 
            className="btn secondary" 
            onClick={() => navigate('/events')}
          >
            Back to Events
          </button>
          <button 
            className="btn primary" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!eventData) return <div className="loading">Loading event data...</div>;

  return (
    <div className="edit-event-container">
      <div className="page-header">
        <h1>Edit Event: {eventData.title}</h1>
        <p>Update event details below</p>
      </div>

      <div className="content-container">
        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Event Title</label>
              <input
                type="text"
                name="title"
                value={eventData.title}
                onChange={(e) => setEventData({...eventData, title: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                name="date"
                value={eventData.date}
                onChange={(e) => setEventData({...eventData, date: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                name="time"
                value={eventData.time}
                onChange={(e) => setEventData({...eventData, time: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                name="location"
                value={eventData.location}
                onChange={(e) => setEventData({...eventData, location: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={eventData.category}
                onChange={(e) => setEventData({...eventData, category: e.target.value})}
                required
              >
                <option value="">Select category</option>
                <option value="academic">Academic</option>
                <option value="sports">Sports</option>
                <option value="cultural">Cultural</option>
                <option value="technology">Technology</option>
                <option value="workshops">Workshops</option>
                <option value="social">Social</option>
              </select>
            </div>

            <div className="form-group">
              <label>Capacity</label>
              <input
                type="number"
                name="capacity"
                value={eventData.capacity}
                onChange={(e) => setEventData({...eventData, capacity: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={eventData.description}
              onChange={(e) => setEventData({...eventData, description: e.target.value})}
              rows="4"
              required
            ></textarea>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isPrivate"
                checked={eventData.isPrivate}
                onChange={(e) => setEventData({...eventData, isPrivate: e.target.checked})}
              />
              <span>Private Event</span>
            </label>
          </div>

          <div className="button-group">
            <button type="submit" className="btn primary">Save Changes</button>
            <button 
              type="button" 
              className="btn secondary"
              onClick={() => navigate('/events')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEvent; 