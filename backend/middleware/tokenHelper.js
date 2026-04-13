const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = 'HS256';

// Create access token (15 minutes expiry)
const createAccessToken = (userId, email) => {
  return jwt.sign(
    { 
      sub: userId, 
      email, 
      type: 'access' 
    },
    JWT_SECRET,
    { 
      algorithm: JWT_ALGORITHM, 
      expiresIn: '15m' 
    }
  );
};

// Create refresh token (7 days expiry)
const createRefreshToken = (userId) => {
  return jwt.sign(
    { 
      sub: userId, 
      type: 'refresh' 
    },
    JWT_SECRET,
    { 
      algorithm: JWT_ALGORITHM, 
      expiresIn: '7d' 
    }
  );
};

// Set authentication cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  });
  
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  });
};

// Clear authentication cookies
const clearAuthCookies = (res) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  setAuthCookies,
  clearAuthCookies
};
