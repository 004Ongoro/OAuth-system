const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const clientController = require('../controllers/clientController');

router.post('/register', authMiddleware, clientController.registerClient);

module.exports = router;