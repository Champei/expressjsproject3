const express = require('express');
const authRoutes = express.Router();
const { register, login, logout, getProfile } = require('../controllers/authController'); // { register: register() }
const authenticate = require('../middlewares/authenticate');

authRoutes.post('/register', register );

authRoutes.post('/login', login);

authRoutes.post('/logout', authenticate, logout);

authRoutes.get('/me', authenticate, getProfile);

module.exports = authRoutes;