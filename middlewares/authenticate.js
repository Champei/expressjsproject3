const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function authenticate (req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({message: 'Authorization token is missing. Login again.'});
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        next();
    } catch (error) {
        return res.status(401).json({message: 'Invalid token. Please login again.'});
    }
}

module.exports = authenticate;