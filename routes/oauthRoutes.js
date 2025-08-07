const express = require('express');
const router = express.Router();

const oauthController = require('../controllers/oauthController');

// Entry point
router.get('/authorize', oauthController.authorize);

// Login routes
router.get('/login', oauthController.getLoginPage);
router.post('/login', oauthController.handleLogin);

// Consent routes
router.get('/consent', oauthController.getConsentPage); 
router.post('/consent', oauthController.handleConsent);

module.exports = router;