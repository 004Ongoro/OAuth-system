const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const sessionController = require('../controllers/sessionController');
const profileController = require('../controllers/profileController');

// public
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/verify-email', authController.verifyEmail);
router.post('/verify-email', authController.verifyEmail); 
router.post('/resend-verification', authController.resendVerification);

// protected
router.get('/me', authMiddleware, authController.me);

router.get('/sessions', authMiddleware, sessionController.getSessions);
router.delete('/sessions/:id', authMiddleware, sessionController.revokeSession);
router.post('/sessions/revoke-all', authMiddleware, sessionController.revokeAllSessions);
router.post('/change-password', authMiddleware, authController.changePassword);
// router.post('/update-profile', authMiddleware, authController.updateProfile);
router.get('/profile', authMiddleware, profileController.getProfile);
router.put('/profile', authMiddleware, profileController.updateProfile);

module.exports = router;
