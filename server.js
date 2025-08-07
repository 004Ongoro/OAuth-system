require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/authRoutes');
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// connect DB
connectDB();

// Middlewares
app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// CORS - allow credentials for cookie usage across subdomains during integration.
// In production, set origin to your apps domain(s), not "*".
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

// Basic rate limiter for public auth endpoints
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
});

// Quick healthcheck and readiness
app.get('/', (req, res) => {
  res.json({ message: 'NeonTek Accounts API - running' });
});

app.get('/test', (req, res) => {
  res.send('OK');
});


app.use('/api/auth', authLimiter, authRoutes);

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

app.listen(PORT, () =>
  console.log(`Server listening on port ${PORT} in ${NODE_ENV} mode`)
);
