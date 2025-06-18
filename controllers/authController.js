const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Token configuration
const ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour for access token
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days for refresh token
const ACCESS_TOKEN_COOKIE_EXPIRY = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
const REFRESH_TOKEN_COOKIE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

// Helper function to generate tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId, type: 'access' }, 
    process.env.JWT_SECRET || 'secretkey', 
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
  
  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' }, 
    process.env.JWT_REFRESH_SECRET || 'refreshsecretkey', 
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
  
  return { accessToken, refreshToken };
};

// Helper function to set token cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };

  // Set access token cookie
  res.cookie('token', accessToken, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_COOKIE_EXPIRY
  });

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_COOKIE_EXPIRY
  });
};

// Register user
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'receptionist'
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    res.status(201).json({
      success: true,
      token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id);

    // Set token cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Render dashboard or redirect
    res.redirect('/dashboard');
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        message: 'Refresh token not provided' 
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || 'refreshsecretkey'
      );

      // Check if it's a refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token type' 
        });
      }

      // Check if user still exists and is active
      const user = await User.findByPk(decoded.id);
      if (!user || !user.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'User not found or inactive' 
        });
      }

      // Generate new tokens
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

      // Set new token cookies
      setTokenCookies(res, newAccessToken, newRefreshToken);

      res.json({
        success: true,
        message: 'Tokens refreshed successfully',
        accessToken: newAccessToken
      });

    } catch (tokenError) {
      // Clear invalid refresh token
      res.clearCookie('refreshToken');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired refresh token' 
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Logout user
exports.logout = (req, res) => {
  // Clear both cookies with same options as when they were set
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  };
  
  res.clearCookie('token', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.redirect('/login');
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};