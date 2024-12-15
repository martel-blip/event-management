import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    preferences: {
      academic: false,
      sports: false,
      cultural: false,
      technology: false,
      workshops: false,
      social: false
    },
      isAdmin: false
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePreferenceChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [name]: checked
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5001/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Store token
      localStorage.setItem('token', data.token);
      
      // Redirect to preferences confirmation or dashboard
      navigate('/events');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="register-container">
      <div className="page-header">
        <h1>Create Your Account</h1>
        <p>Join us to stay updated with campus events</p>
      </div>
      
      <div className="content-container">
        <div className="form-container">
          <form className="register-form" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input 
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
                minLength="6"
              />
            </div>

            <div className="form-group">
              <label>Event Preferences</label>
              <p className="help-text">Select the types of events you're interested in</p>
              <div className="preferences-grid">
                {Object.entries({
                  academic: 'Academic',
                  sports: 'Sports',
                  cultural: 'Cultural',
                  technology: 'Technology',
                  workshops: 'Workshops',
                  social: 'Social'
                }).map(([key, label]) => (
                  <label key={key} className="checkbox-label">
                    <input
                      type="checkbox"
                      name={key}
                      checked={formData.preferences[key]}
                      onChange={handlePreferenceChange}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="btn primary">Create Account</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 