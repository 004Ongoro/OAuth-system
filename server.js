require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const passport = require('passport');

const authRoutes = require('./routes/authRoutes');
const apiKeyRoutes = require('./routes/apiKeyRoutes');

const apiKeyAuth = require('./middleware/apiKeyAuth');

const connectDB = require('./config/db');
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// connect DB
connectDB();

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize()); 

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/', (req, res) => {
  res.json({ message: 'NeonTek Accounts API - running' });
});

app.get('/test', (req, res) => {
  res.send('OK');
});

// Middlewares

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/keys', authLimiter, apiKeyRoutes);

app.get('/api/protected-data', apiKeyAuth, (req, res) => { 
  res.json({
    message: "Success! You have accessed protected data with an API Key.",
    user: req.user,
    auth: req.auth
  });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () =>
  console.log(`Server listening on port ${PORT} in ${NODE_ENV} mode`)
);
