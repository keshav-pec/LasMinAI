const jwt = require('jsonwebtoken');

const requireAuth = (req, res, next) => {
  const token = req.cookies?.auth_token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthorized - No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_hackathon');
    req.user = decoded; // Contains id, email, name, picture
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Unauthorized - Invalid token' });
  }
};

module.exports = { requireAuth };
