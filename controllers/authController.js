const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Token configuration
const ACCESS_TOKEN_EXPIRY = '24h'; // 24 hour for access token
const ACCESS_TOKEN_COOKIE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Validate JWT secret on startup
const validateJWTSecret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'secretkey') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. Set a secure JWT_SECRET in production!');
  }
};

// Initialize validation
validateJWTSecret();

// Cookie options function
const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: ACCESS_TOKEN_COOKIE_EXPIRY,
  path: '/'
});

// Helper function to generate access token
const generateAccessToken = (userId) => {
  if (!userId) {
    throw new Error('User ID is required for token generation');
  }

  return jwt.sign(
    { 
      id: userId, 
      iat: Math.floor(Date.now() / 1000)
    }, 
    process.env.JWT_SECRET || 'secretkey', 
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

// Function to set token cookie
const setTokenCookie = (res, accessToken) => {
  try {
    // Set access token cookie
    res.cookie('token', accessToken, getCookieOptions());

    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    });

    console.log('✅ Token set successfully');
  } catch (error) {
    console.error('❌ Error setting token cookie:', error);
    throw new Error('Failed to set authentication cookie');
  }
};

// Function to clear auth cookie
const clearAuthCookie = (res) => {
  const cookieOptions = getCookieOptions();
  delete cookieOptions.maxAge; // Remove maxAge for clearing
  
  res.clearCookie('token', cookieOptions);
  console.log('🧹 Auth cookie cleared');
};

// Register user
exports.register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Username, email, and password are required' 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists' 
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      role: role || 'receptionist'
    });

    // Generate access token
    const accessToken = generateAccessToken(user.id);

    // Set secure cookie for web registration
    setTokenCookie(res, accessToken);

    console.log(`✅ User registered successfully: ${username} (${user.id})`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' ? error.message : 'Registration failed'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('❌ Login attempt with missing credentials');
      return res.status(400).json({ 
        success: false,
        message: 'Username and password are required' 
      });
    }

    // Check if user exists
    const user = await User.findOne({ where: { username } });
    if (!user) {
      console.log(`❌ Login attempt with non-existent user: ${username}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`❌ Login attempt with invalid password for user: ${username}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      console.log(`❌ Login attempt with deactivated account: ${username}`);
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated. Please contact support.' 
      });
    }

    // Generate access token
    const accessToken = generateAccessToken(user.id);

    // Set token cookie with enhanced security
    setTokenCookie(res, accessToken);

    console.log(`✅ User logged in successfully: ${username} (${user.id})`);

    // Check if this is an AJAX request
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({
        success: true,
        message: 'Login successful',
        redirectUrl: '/dashboard'
      });
    }

    // For regular form submission, redirect to dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('❌ Login error:', error);
    
    // Check if this is an AJAX request
    if (req.xhr || req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' ? error.message : 'Login failed'
      });
    }

    // For regular form submission, redirect to login with error
    res.redirect('/login?error=' + encodeURIComponent('Login failed. Please try again.'));
  }
};



// Logout user
exports.logout = (req, res) => {
  // Clear cookie with same options as when it was set
  clearAuthCookie(res);
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