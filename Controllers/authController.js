const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require("uuid");
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { writeAll, readAll } = require('../utils/file');

function register (req, res) {
    const {name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({message: 'missing required fields'});
    }

    const users = readAll('users.json');
    if (!users) users = [];

    const existing = users.find(user => user.email === email);
    if (existing) {
        return res.status(409).json({message: 'User with this email already exists. Please go to Login.'});
    }

    const hashedPassword = bcryptjs.hashSync(password, 10); // 10 is the salt rounds. It determines how many times the hashing process is applied. Higher rounds means more security but also more time to hash.

    const newUser = {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword
    };

    users.push(newUser);

    writeAll('users.json', users);
    res.status(201).json({
        message: 'User registered successfully',
        user: {
            name, email
        }
    });
}

function login (req, res) {
    
    const {email, password} = req.body;

    if (!email || !password) {
        return res.status(400).json({message: 'missing required fields'});
    }

    const users = readAll('users.json');
    const user = users.find(user => user.email === email);
    if (!user) {
        return res.status(404).json({message: 'User not found. Please register first.'});
    }

    const isMatch = bcryptjs.compareSync(password, user.password);
    if (!isMatch) {
        return res.status(401).json({message: 'Invalid credentials. Please try again.'});
    }

    const userData = {
        id: user.id,
        email: user.email,
        name: user.name
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.cookie('token', token, {
        httpOnly: true, // This makes the cookie inaccessible to JavaScript on the client side, providing protection against XSS attacks.
        maxAge: 3600000, // 1 hour in milliseconds. This sets the expiration time for the cookie.
        sameSite: 'strict' // This prevents the browser from sending the cookie along with cross-site requests, providing protection against CSRF attacks.
    });

    res.status(200).json({
        message: 'User logged in successfully',
        user: {
            name: user.name,
            email: user.email,
            username: user.name
        }
    });
}

function logout (req, res) {
    res.clearCookie('token');
    res.status(200).json({message: 'User logged out successfully'});
}

function getProfile (req, res) {
    const user = req.user; 
    res.status(200).json({ user });
}

module.exports = {
    register,
    login,
    logout,
    getProfile
}
