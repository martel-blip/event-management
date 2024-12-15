const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

// Debug environment variables
console.log('Environment variables:', {
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV
});

// Middleware
app.use(cors());
app.use(express.json());

// Add this near the top after middleware setup
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.params);
  next();
});

// Add this after your other middleware
app.use((req, res, next) => {
  console.log('Request Body:', req.body);
  console.log('Request Headers:', req.headers);
  next();
});

// Add this near the top with other middleware
const isAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user?.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(401).json({ message: 'Invalid token or unauthorized' });
  }
};

// Add this middleware before your routes
const validateEventId = (req, res, next) => {
  const { eventId } = req.params;
  if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
    return res.status(400).json({ message: 'Invalid event ID format' });
  }
  next();
};

// Add this near the top with other routes, before the MongoDB connection
app.get('/', (req, res) => {
  res.send('Welcome to the Events API Server');
});

// Or if you want to serve your React frontend from the backend
app.use(express.static('frontend/build'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Add this before your routes
app.use(express.static(path.join(__dirname, '../frontend/build')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
    // Only start server after DB connection is established
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.error('MongoDB URI:', process.env.MONGODB_URI);
    process.exit(1);
  });

// Define Schemas
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  preferences: {
    academic: Boolean,
    sports: Boolean,
    cultural: Boolean,
    technology: Boolean,
    workshops: Boolean,
    social: Boolean
  },
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  capacity: { type: Number, required: true },
  isPrivate: { type: Boolean, default: false },
  registrationDeadline: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  registeredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, preferences } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      preferences,
      isAdmin: email === "martelamanor2004@icloud.com" ? true : false
    });

    await user.save();
    console.log('Created user with admin status:', user.isAdmin);

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        isAdmin: user.isAdmin
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Token payload:', jwt.decode(token));

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        fullName, 
        email,
        isAdmin: user.isAdmin
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        isAdmin: user.isAdmin  // Important: Include this
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin  // Important: Include this
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Event Routes - Specific routes first
// 1. Get single event route
app.get('/api/events/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('Fetching event with ID:', eventId); // Add debug log
    
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }

    const event = await Event.findById(eventId);
    console.log('Found event:', event); // Add debug log
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Convert the date to ISO string for frontend
    const eventData = event.toObject();
    if (eventData.date) {
      eventData.date = new Date(eventData.date).toISOString().split('T')[0];
    }

    res.json(eventData);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ message: 'Error fetching event details' });
  }
});

// 2. Create event route
app.post('/api/events', isAdmin, async (req, res) => {
  try {
    const event = new Event({
      ...req.body,
      createdBy: req.user._id
    });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Event creation error:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
});

// 3. Update event route
app.put('/api/events/:eventId', isAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      eventId,
      { ...req.body },
      { new: true, runValidators: true }
    );

    res.json(updatedEvent);
  } catch (error) {
    console.error('Event update error:', error);
    res.status(500).json({ message: 'Error updating event' });
  }
});

// 4. Delete event route
app.delete('/api/events/:eventId', isAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log('Attempting to delete event:', eventId);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ message: 'Invalid event ID format' });
    }
    
    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Delete the event
    await Event.findByIdAndDelete(eventId);
    console.log('Event deleted successfully:', eventId);
    
    // Set proper headers
    res.setHeader('Content-Type', 'application/json');
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Error deleting event' });
  }
});

// 5. RSVP route
app.post('/api/events/:eventId/rsvp', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.registeredUsers.length >= event.capacity) {
      return res.status(400).json({ message: 'Event is full' });
    }

    if (!event.registeredUsers.includes(userId)) {
      event.registeredUsers.push(userId);
      await event.save();
    }

    res.json({ message: 'RSVP successful' });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ message: 'Error processing RSVP' });
  }
});

// 6. General get all events route (LAST)
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().populate('createdBy', 'fullName email');
    res.json(events);
  } catch (error) {
    console.error('Event fetch error:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working' });
});

// Add this route temporarily to create an admin user
app.post('/api/create-admin', async (req, res) => {
  console.log('Received create admin request:', req.body);
  try {
    const { email, password, fullName } = req.body;
    
    if (!email || !password || !fullName) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        received: req.body 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const adminUser = new User({
      email,
      password: hashedPassword,
      fullName,
      isAdmin: true,
      preferences: {}
    });

    await adminUser.save();
    console.log('Admin user created:', {
      email: adminUser.email,
      fullName: adminUser.fullName,
      isAdmin: adminUser.isAdmin
    });
    
    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ 
      message: 'Error creating admin user',
      error: error.message 
    });
  }
});

// Add this route to check admin status
app.get('/api/check-admin', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    res.json({ 
      isAdmin: user?.isAdmin || false,
      email: user?.email
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Add this temporary route to make a user admin
app.post('/api/make-admin', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isAdmin = true;
    await user.save();
    
    res.json({ message: 'User is now an admin', email: user.email });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user' });
  }
});

// Add this route to get user's RSVP'd events
app.get('/api/users/events', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const events = await Event.find({
      registeredUsers: decoded.userId
    }).populate('createdBy', 'fullName email');

    res.json(events);
  } catch (error) {
    console.error('Error fetching user events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Add route to cancel RSVP
app.delete('/api/events/:eventId/rsvp', async (req, res) => {
  try {
    const { eventId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    event.registeredUsers = event.registeredUsers.filter(
      userId => userId.toString() !== decoded.userId
    );
    await event.save();

    res.json({ message: 'RSVP cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling RSVP:', error);
    res.status(500).json({ message: 'Error cancelling RSVP' });
  }
});

// Add this after all your API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Add this near the end of your file, before the last app.get('*')
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Add this temporary route to ensure the specific user is admin
app.post('/api/ensure-admin', async (req, res) => {
  try {
    const email = "martelamanor2004@icloud.com";
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { isAdmin: true } },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ 
      message: 'User is now an admin', 
      email: user.email,
      isAdmin: user.isAdmin 
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ message: 'Error updating admin status' });
  }
});

// Add this route at the top of your routes
app.post('/api/force-admin', async (req, res) => {
  try {
    const targetEmail = "martelamanor2004@icloud.com";
    
    // First, try to find the user
    let user = await User.findOne({ email: targetEmail });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Force update the isAdmin field
    user.isAdmin = true;
    await user.save();
    
    // Create a new token with admin privileges
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        isAdmin: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('User updated to admin:', user.email);
    
    res.json({ 
      message: 'User successfully made admin',
      token,
      user: {
        id: user._id,
        email: user.email,
        isAdmin: true
      }
    });
  } catch (error) {
    console.error('Force admin error:', error);
    res.status(500).json({ message: 'Error updating admin status' });
  }
});

// Add this after your other routes
app.post('/api/reset-password', async (req, res) => {
  try {
    const email = "martelamanor2004@icloud.com";
    const newPassword = "Godisgood001";
    
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password and make them admin
    user.password = hashedPassword;
    user.isAdmin = true;
    await user.save();

    console.log('Password reset and admin status updated for:', email);

    res.json({ 
      message: 'Password reset successful and user is now admin',
      email: user.email
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});