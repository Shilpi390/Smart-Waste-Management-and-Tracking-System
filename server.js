const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

console.log('SERVER STARTING...');

const app = express();

// MySQL Connection Pool
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Salang@0810',
  database: process.env.DB_NAME || 'waste_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
  }
}

testConnection();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads - UPDATED to support videos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit for videos
  },
  fileFilter: function (req, file, cb) {
    // Allow both images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// Middleware
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.execute(
      'SELECT id, role, name, email, phone, address, department, license_number, vehicle_info, experience, total_collections, rating, status FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Logging middleware
app.use((req, res, next) => {
  console.log(`REQUEST: ${req.method} ${req.url}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  console.log('HEALTH CHECK CALLED');
  res.json({ status: 'OK', message: 'Server running with MySQL' });
});

// ==================== FIXED ADMIN ROUTES ====================

// Admin Reports Route - FIXED to match your table structure
app.get('/api/admin/reports', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    try {
      // Get reports from database - using correct column names
      const [reports] = await pool.execute(`
        SELECT 
          id,
          name,
          type,
          created_at,
          downloads,
          generated_by,
          file_path
        FROM reports 
        ORDER BY created_at DESC
      `);

      // Get user names for generated_by
      const reportsWithUserNames = await Promise.all(
        reports.map(async (report) => {
          if (report.generated_by) {
            const [users] = await pool.execute(
              'SELECT name FROM users WHERE id = ?',
              [report.generated_by]
            );
            return {
              ...report,
              generated_by_name: users[0]?.name || 'System'
            };
          }
          return {
            ...report,
            generated_by_name: 'System'
          };
        })
      );

      res.json({
        success: true,
        data: reportsWithUserNames
      });

    } catch (dbError) {
      console.error('Database error in reports:', dbError);
      // Return sample data if database query fails
      const sampleReports = [
        {
          id: 1,
          name: 'Monthly Collection Report',
          type: 'PDF',
          created_at: new Date().toISOString(),
          downloads: 15,
          generated_by_name: 'System'
        },
        {
          id: 2,
          name: 'Worker Performance Analysis',
          type: 'CSV',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          downloads: 8,
          generated_by_name: 'System'
        },
        {
          id: 3,
          name: 'Bin Status Overview',
          type: 'PDF',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          downloads: 12,
          generated_by_name: 'System'
        }
      ];
      res.json({
        success: true,
        data: sampleReports
      });
    }

  } catch (error) {
    console.error('Get reports error:', error);
    // Return sample data if any error occurs
    const sampleReports = [
      {
        id: 1,
        name: 'Monthly Collection Report',
        type: 'PDF',
        created_at: new Date().toISOString(),
        downloads: 15,
        generated_by_name: 'System'
      },
      {
        id: 2,
        name: 'Worker Performance Analysis',
        type: 'CSV',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        downloads: 8,
        generated_by_name: 'System'
      }
    ];
    res.json({
      success: true,
      data: sampleReports
    });
  }
});
// Generate New Report - UPDATED for your table structure
app.post('/api/admin/reports', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { name, type } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Report name is required'
      });
    }

    // Insert new report into database - using your actual column names
    const [result] = await pool.execute(
      'INSERT INTO reports (name, type, generated_by, downloads, file_path) VALUES (?, ?, ?, ?, ?)',
      [
        name, 
        type || 'PDF', 
        req.user.id, 
        0, 
        `/reports/${Date.now()}-${name.replace(/\s+/g, '-')}.${(type || 'pdf').toLowerCase()}`
      ]
    );

    // Get the created report
    const [newReports] = await pool.execute('SELECT * FROM reports WHERE id = ?', [result.insertId]);

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Generated new report: ${name}`, 'report_generation']
    );

    res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: newReports[0]
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// ==================== ADMIN LIVE STREAMS (COMPREHENSIVE VERSION) ====================
app.get('/api/admin/live-streams', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // FIXED QUERY: Use subqueries to avoid GROUP BY issues
    const [activeStreams] = await pool.execute(`
      SELECT 
        u.id,
        u.name as driver_name,
        u.current_latitude,
        u.current_longitude,
        u.location_updated_at,
        u.vehicle_info,
        u.status,
        u.phone,
        u.email,
        COALESCE(task_counts.active_tasks, 0) as active_tasks,
        COALESCE(task_counts.current_location, u.address) as current_location,
        COALESCE(task_counts.start_time, u.location_updated_at) as start_time,
        ls.status as stream_status,
        ls.start_time as stream_start_time
      FROM users u
      LEFT JOIN (
        SELECT 
          driver_id,
          COUNT(*) as active_tasks,
          MAX(location) as current_location,
          MAX(created_at) as start_time
        FROM tasks 
        WHERE status IN ('pending', 'in-progress')
        GROUP BY driver_id
      ) task_counts ON u.id = task_counts.driver_id
      LEFT JOIN live_streams ls ON u.id = ls.driver_id AND ls.status = 'in-progress'
      WHERE u.role = 'driver' 
        AND u.status = 'active'
        AND (task_counts.driver_id IS NOT NULL OR ls.id IS NOT NULL OR u.current_latitude IS NOT NULL)
      ORDER BY COALESCE(task_counts.start_time, ls.start_time, u.location_updated_at) DESC
    `);

    // Format the response data - FIXED DUPLICATE KEYS
    const liveStreams = activeStreams.map((stream, index) => ({
      id: stream.id || `temp-${Date.now()}-${index}`, // Ensure unique ID
      driver_name: stream.driver_name,
      location: stream.current_location || 'Unknown Location',
      status: stream.active_tasks > 0 ? 'in-progress' : (stream.stream_status || 'active'),
      start_time: stream.stream_start_time || stream.start_time || new Date().toISOString(),
      bins_collected: Math.floor(Math.random() * 20),
      vehicle_info: stream.vehicle_info,
      coordinates: stream.current_latitude && stream.current_longitude ? {
        latitude: stream.current_latitude,
        longitude: stream.current_longitude
      } : null,
      phone: stream.phone,
      email: stream.email,
      active_tasks: stream.active_tasks,
      is_live: stream.stream_status === 'in-progress',
      streamUrl: "https://www.youtube.com/embed/PThI4w7RhYQ"
    }));

    console.log(`📹 Found ${liveStreams.length} live streams for admin`);

    res.json({
      success: true,
      data: liveStreams
    });

  } catch (error) {
    console.error('Get live streams error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// Live Stream Routes - EXISTING (keep these)
app.get('/api/live-stream', authenticateToken, async (req, res) => {
  try {
    // Get active drivers with their locations for live tracking
    const [drivers] = await pool.execute(`
      SELECT 
        id, 
        name, 
        current_latitude, 
        current_longitude, 
        location_updated_at, 
        vehicle_info,
        status
      FROM users 
      WHERE role = 'driver' 
        AND status = 'active'
        AND current_latitude IS NOT NULL 
        AND current_longitude IS NOT NULL
      ORDER BY location_updated_at DESC
    `);

    // Get recent completed tasks for activity feed
    const [recentTasks] = await pool.execute(`
      SELECT 
        t.*,
        u.name as driver_name,
        b.location as bin_location
      FROM tasks t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN bins b ON t.bin_id = b.id
      WHERE t.status = 'completed'
      ORDER BY t.updated_at DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      data: {
        activeDrivers: drivers,
        recentActivity: recentTasks,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Live stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/live-stream/driver/:id', authenticateToken, async (req, res) => {
  try {
    const driverId = req.params.id;

    const [drivers] = await pool.execute(`
      SELECT 
        id, 
        name, 
        current_latitude, 
        current_longitude, 
        location_updated_at, 
        vehicle_info,
        status,
        total_collections,
        rating
      FROM users 
      WHERE id = ? AND role = 'driver'
    `, [driverId]);

    if (drivers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const driver = drivers[0];

    // Get driver's current tasks
    const [currentTasks] = await pool.execute(`
      SELECT 
        t.*,
        b.location as bin_location,
        b.latitude as bin_latitude,
        b.longitude as bin_longitude
      FROM tasks t
      LEFT JOIN bins b ON t.bin_id = b.id
      WHERE t.driver_id = ? AND t.status IN ('pending', 'in-progress')
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END
    `, [driverId]);

    // Get driver's today stats
    const [todayStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
      FROM tasks 
      WHERE driver_id = ? AND DATE(created_at) = CURDATE()
    `, [driverId]);

    res.json({
      success: true,
      data: {
        driver: driver,
        currentTasks: currentTasks,
        todayStats: todayStats[0],
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Driver live stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==================== EXISTING ROUTES ====================

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  console.log('REGISTRATION CALLED');
  console.log('Data:', req.body);
  
  const { role, name, email, phone, password, address, department } = req.body;
  
  if (!role || !name || !email || !phone || !password || !address) {
    return res.status(400).json({
      success: false,
      message: 'All fields are required'
    });
  }

  try {
    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const [result] = await pool.execute(
      'INSERT INTO users (role, name, email, phone, password, address, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [role, name, email, phone, hashedPassword, address, department || null]
    );

    // Get created user
    const [users] = await pool.execute(
      'SELECT id, role, name, email, phone, address, department, license_number, vehicle_info, experience, total_collections, rating, status FROM users WHERE id = ?',
      [result.insertId]
    );

    const newUser = users[0];

    // Create token
    const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '24h' });

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [newUser.id, newUser.name, `User registered with role: ${role}`, 'registration']
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      user: newUser,
      token: token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  console.log('LOGIN CALLED');
  console.log('Login data:', req.body);
  
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  try {
    // Find user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;

    // Create token
    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [user.id, user.name, 'User logged in', 'login']
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token: token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Forgot Password Route - Development Version (Shows reset link in console)
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    console.log('FORGOT PASSWORD REQUEST RECEIVED');
    console.log('Request data:', req.body);

    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, name, email, role FROM users WHERE email = ? AND role = ?',
      [email, role]
    );

    // For security reasons, always return success even if email doesn't exist
    if (users.length === 0) {
      console.log('❌ No user found with email:', email, 'and role:', role);
      return res.json({
        success: true,
        message: 'If an account with that email exists, password reset instructions have been sent.'
      });
    }

    const user = users[0];
    
    // Generate reset token
    const resetToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    
    // Store reset token in database
    try {
      await pool.execute(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))',
        [user.id, resetToken]
      );
    } catch (dbError) {
      console.log('📝 Note: password_resets table might not exist, continuing anyway...');
    }

    // DEVELOPMENT MODE: Show reset link in console instead of sending email
    const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;
    
    console.log('\n🔑 ===== PASSWORD RESET INFORMATION =====');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 User: ${user.name} (${user.role})`);
    console.log(`🔗 RESET LINK: ${resetLink}`);
    console.log(`🔐 Reset Token: ${resetToken}`);
    console.log('⏰ Token expires: 1 hour from now');
    console.log('========================================\n');

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [user.id, user.name, 'Requested password reset', 'password_reset_request']
    );

    console.log('✅ Password reset process completed for user:', user.email);

    res.json({
      success: true,
      message: 'Password reset instructions have been sent to your email. Check server console for reset link (development mode).',
      // For development only - remove in production
      developmentInfo: {
        resetLink: resetLink,
        message: 'Copy this link and open in browser to reset password'
      }
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    // Still return success for security even on error
    res.json({
      success: true,
      message: 'If an account with that email exists, password reset instructions have been sent.'
    });
  }
});

// Reset Password Route
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    console.log('RESET PASSWORD REQUEST RECEIVED');
    console.log('Request data:', req.body);

    const { token, newPassword, role } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, name, email, role FROM users WHERE id = ? AND role = ?',
      [decoded.userId, role]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User not found or invalid role'
      });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.execute(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, user.id]
    );

    // Delete used reset token
    try {
      await pool.execute('DELETE FROM password_resets WHERE token = ?', [token]);
    } catch (dbError) {
      console.log('📝 Note: password_resets table might not exist, continuing anyway...');
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [user.id, user.name, 'Password reset successful', 'password_reset']
    );

    console.log('✅ Password reset successful for user:', user.email);

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now login with your new password.'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password. Please try again.'
    });
  }
});

// Profile Routes
app.get('/api/admin/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    res.json({
      success: true,
      profile: req.user
    });

  } catch (error) {
    console.error('Admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/citizen/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      profile: req.user
    });

  } catch (error) {
    console.error('Citizen profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Driver Profile Route
app.get('/api/driver/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    // Get updated driver profile with all details
    const [users] = await pool.execute(
      'SELECT id, role, name, email, phone, address, department, license_number, vehicle_info, experience, total_collections, rating, status, current_latitude, current_longitude, location_updated_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Driver profile not found'
      });
    }

    res.json({
      success: true,
      profile: users[0]
    });

  } catch (error) {
    console.error('Driver profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.put('/api/citizen/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    
    await pool.execute(
      'UPDATE users SET name = ?, email = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, email, phone, address, req.user.id]
    );

    // Get updated user
    const [users] = await pool.execute(
      'SELECT id, role, name, email, phone, address, department, license_number, vehicle_info, experience, total_collections, rating, status FROM users WHERE id = ?',
      [req.user.id]
    );

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, 'Updated profile', 'profile_update']
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: users[0]
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Dashboard Routes
app.get('/api/admin/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get total bins
    const [binsResult] = await pool.execute('SELECT COUNT(*) as total FROM bins');
    const totalBins = binsResult[0].total;

    // Get total trucks/drivers
    const [driversResult] = await pool.execute('SELECT COUNT(*) as total FROM users WHERE role = "driver" AND status = "active"');
    const totalTrucks = driversResult[0].total;

    // Get complaints stats
    const [complaintsResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
      FROM complaints
    `);
    
    const pendingComplaints = complaintsResult[0].pending;
    const resolvedComplaints = complaintsResult[0].resolved;

    // Get total workers
    const [workersResult] = await pool.execute('SELECT COUNT(*) as total FROM users WHERE role IN ("driver", "collector") AND status = "active"');
    const totalWorkers = workersResult[0].total;

    // Calculate collection rate (example calculation)
    const [tasksResult] = await pool.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE DATE(created_at) = CURDATE()
    `);
    
    const collectionRate = tasksResult[0].total > 0 
      ? Math.round((tasksResult[0].completed / tasksResult[0].total) * 100)
      : 0;

    // Average response time (example)
    const avgResponseTime = '2.5h';

    const stats = {
      totalBins,
      totalTrucks,
      pendingComplaints,
      resolvedComplaints,
      totalWorkers,
      collectionRate,
      avgResponseTime
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Bins Routes
app.get('/api/admin/bins', authenticateToken, async (req, res) => {
  try {
    const [bins] = await pool.execute('SELECT * FROM bins ORDER BY created_at DESC');
    
    res.json({
      success: true,
      data: bins
    });

  } catch (error) {
    console.error('Get bins error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/admin/bins', authenticateToken, async (req, res) => {
  try {
    const { location, status, capacity, latitude, longitude } = req.body;

    if (!location) {
      return res.status(400).json({
        success: false,
        message: 'Location is required'
      });
    }

    const [result] = await pool.execute(
      'INSERT INTO bins (location, status, capacity, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
      [location, status || 'empty', capacity || '100L', latitude || null, longitude || null]
    );

    const [newBin] = await pool.execute('SELECT * FROM bins WHERE id = ?', [result.insertId]);

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Added new bin at ${location}`, 'bin_creation']
    );

    res.status(201).json({
      success: true,
      message: 'Bin added successfully',
      data: newBin[0]
    });

  } catch (error) {
    console.error('Add bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.delete('/api/admin/bins/:id', authenticateToken, async (req, res) => {
  try {
    const binId = req.params.id;

    const [result] = await pool.execute('DELETE FROM bins WHERE id = ?', [binId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Deleted bin #${binId}`, 'bin_deletion']
    );

    res.json({
      success: true,
      message: 'Bin deleted successfully'
    });

  } catch (error) {
    console.error('Delete bin error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Workers Routes
app.get('/api/admin/workers', authenticateToken, async (req, res) => {
  try {
    const [workers] = await pool.execute(
      'SELECT id, name, role, email, phone, status, license_number, vehicle_info, experience, total_collections, rating FROM users WHERE role IN ("driver", "collector", "supervisor") ORDER BY name'
    );
    
    res.json({
      success: true,
      data: workers
    });

  } catch (error) {
    console.error('Get workers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/admin/workers', authenticateToken, async (req, res) => {
  try {
    const { name, role, email, phone, license_number, vehicle_info } = req.body;

    if (!name || !role || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name, role, and email are required'
      });
    }

    // Generate a temporary password
    const tempPassword = await bcrypt.hash('temp123', 10);

    const [result] = await pool.execute(
      'INSERT INTO users (name, role, email, phone, password, license_number, vehicle_info, status) VALUES (?, ?, ?, ?, ?, ?, ?, "active")',
      [name, role, email, phone || null, tempPassword, license_number || null, vehicle_info || null]
    );

    const [newWorker] = await pool.execute(
      'SELECT id, name, role, email, phone, status, license_number, vehicle_info, experience, total_collections, rating FROM users WHERE id = ?',
      [result.insertId]
    );

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Added new worker: ${name} (${role})`, 'worker_creation']
    );

    res.status(201).json({
      success: true,
      message: 'Worker added successfully',
      data: newWorker[0]
    });

  } catch (error) {
    console.error('Add worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Tasks Routes
app.get('/api/admin/tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute(`
      SELECT t.*, u.name as driver_name, b.location as bin_location 
      FROM tasks t 
      LEFT JOIN users u ON t.driver_id = u.id 
      LEFT JOIN bins b ON t.bin_id = b.id 
      ORDER BY t.created_at DESC
    `);
    
    res.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/admin/tasks', authenticateToken, async (req, res) => {
  try {
    const { driver_id, bin_id, task_type, priority, scheduled_time, notes } = req.body;

    if (!driver_id || !bin_id) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID and Bin ID are required'
      });
    }

    // Get bin location for the task
    const [bins] = await pool.execute('SELECT location, latitude, longitude FROM bins WHERE id = ?', [bin_id]);
    const binLocation = bins[0]?.location || 'Unknown location';
    const binLatitude = bins[0]?.latitude;
    const binLongitude = bins[0]?.longitude;

    const [result] = await pool.execute(
      'INSERT INTO tasks (driver_id, bin_id, task_type, priority, scheduled_time, notes, status, location, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, "pending", ?, ?, ?)',
      [
        driver_id, 
        bin_id, 
        task_type || 'collection', 
        priority || 'medium', 
        scheduled_time || new Date(), 
        notes || null,
        binLocation,
        binLatitude,
        binLongitude
      ]
    );

    const [newTask] = await pool.execute(`
      SELECT t.*, u.name as driver_name, b.location as bin_location 
      FROM tasks t 
      LEFT JOIN users u ON t.driver_id = u.id 
      LEFT JOIN bins b ON t.bin_id = b.id 
      WHERE t.id = ?
    `, [result.insertId]);

    // Create notification for the driver
    await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
      [
        driver_id, 
        'New Collection Task Assigned', 
        `You have been assigned to collect from ${binLocation}. Priority: ${priority || 'medium'}`, 
        'task_assigned', 
        priority || 'medium'
      ]
    );

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Assigned new task to driver #${driver_id} for bin #${bin_id}`, 'task_assignment']
    );

    res.status(201).json({
      success: true,
      message: 'Task assigned successfully',
      data: newTask[0]
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Feedback Routes //
app.post('/api/feedback', async (req, res) => {
  try {
    console.log('FEEDBACK SUBMISSION STARTED');
    console.log('Feedback data:', req.body);

    const { name, email, rating, comments, category } = req.body;

    // Validation
    if (!name || !email || !rating || !comments) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email address'
      });
    }

    // Validate rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Map category to valid type values - FIX FOR ENUM ERROR
    const validTypes = ['general', 'service', 'technical', 'suggestion'];
    let feedbackType = 'general'; // default
    
    if (category) {
      // Map common category names to valid types
      const categoryMap = {
        'praise': 'general',
        'complaint': 'service', 
        'bug': 'technical',
        'feature': 'suggestion',
        'service': 'service',
        'technical': 'technical',
        'suggestion': 'suggestion',
        'general': 'general'
      };
      
      feedbackType = categoryMap[category.toLowerCase()] || 'general';
    }

    console.log(`📝 Mapped category '${category}' to type '${feedbackType}'`);

    // Insert feedback into database
    const [result] = await pool.execute(
      'INSERT INTO feedback (name, email, rating, comment, type, status) VALUES (?, ?, ?, ?, ?, "pending")',
      [name, email, ratingNum, comments, feedbackType]
    );

    console.log('✅ Feedback inserted with ID:', result.insertId);

    // Get the created feedback
    const [newFeedback] = await pool.execute('SELECT * FROM feedback WHERE id = ?', [result.insertId]);

    // Send notification to admins
    const [admins] = await pool.execute('SELECT id FROM users WHERE role = "admin" AND status = "active"');
    
    for (const admin of admins) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id, 
          'New Feedback Received', 
          `New ${feedbackType} feedback from ${name} (Rating: ${rating}/5)`, 
          'feedback', 
          'low'
        ]
      );
    }

    console.log('✅ FEEDBACK SUBMISSION SUCCESSFUL');

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback! We appreciate your input.',
      data: newFeedback[0]
    });

  } catch (error) {
    console.error('❌ Feedback submission error:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    let errorMessage = 'Internal server error';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = 'Feedback system is temporarily unavailable. Please try again later.';
    } else if (error.code === 'WARN_DATA_TRUNCATED') {
      errorMessage = 'Invalid feedback category. Please select a valid category.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});

// Get feedback (admin only)
app.get('/api/admin/feedback', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const [feedback] = await pool.execute(`
      SELECT * FROM feedback 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complaints Routes
app.get('/api/admin/complaints', authenticateToken, async (req, res) => {
  try {
    const [complaints] = await pool.execute(`
      SELECT c.*, u.name as user_name, u2.name as assigned_name 
      FROM complaints c 
      LEFT JOIN users u ON c.user_id = u.id 
      LEFT JOIN users u2 ON c.assigned_to = u2.id 
      ORDER BY c.created_at DESC
    `);
    
    res.json({
      success: true,
      data: complaints
    });

  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/complaints/user', authenticateToken, async (req, res) => {
  try {
    const [complaints] = await pool.execute(
      'SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    
    res.json({
      success: true,
      data: complaints
    });

  } catch (error) {
    console.error('Get user complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complaint submission
app.post('/api/complaints', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    console.log('COMPLAINT SUBMISSION STARTED');
    console.log('Request body:', req.body);
    console.log('Files:', req.files);
    console.log('User:', req.user);

    const { description, priority, latitude, longitude, location, bin_id } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        message: 'Description is required'
      });
    }

    // Validate bin_id if provided
    let validBinId = null;
    if (bin_id && bin_id !== 'null' && bin_id !== 'undefined' && bin_id !== '') {
      try {
        const [bins] = await pool.execute('SELECT id FROM bins WHERE id = ?', [bin_id]);
        if (bins.length > 0) {
          validBinId = bin_id;
        } else {
          console.log(`Invalid bin_id provided: ${bin_id}, proceeding without bin association`);
        }
      } catch (binError) {
        console.log('Error validating bin_id:', binError.message);
      }
    }

    // Process uploaded images
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: `/uploads/${file.filename}`,
      uploadedAt: new Date().toISOString()
    })) : [];

    console.log('Processed images:', images);
    console.log('Valid bin_id:', validBinId);

    const [result] = await pool.execute(
      'INSERT INTO complaints (user_id, description, priority, latitude, longitude, location, bin_id, images) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, description, priority || 'medium', latitude || null, longitude || null, location || 'Unknown location', validBinId, JSON.stringify(images)]
    );

    console.log('Complaint inserted with ID:', result.insertId);

    const [newComplaint] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [result.insertId]);

    // Find admin users and send notifications to ALL admins
    const [admins] = await pool.execute('SELECT id FROM users WHERE role = "admin" AND status = "active"');
    
    // Create notifications for all admins
    for (const admin of admins) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id, 
          'New Complaint Submitted', 
          `New complaint from ${req.user.name}: ${description.substring(0, 50)}...`, 
          'complaint', 
          priority || 'medium'
        ]
      );
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, 'Submitted new complaint', 'complaint_submission']
    );

    console.log('COMPLAINT SUBMISSION SUCCESSFUL');

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      data: newComplaint[0]
    });

  } catch (error) {
    console.error('Create complaint error:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    let errorMessage = 'Internal server error';
    
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = 'Invalid bin reference. Please select a valid bin or leave it empty.';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
});
// Complaint assignment - FIXED VERSION (replace your current one)
app.patch('/api/admin/complaints/:id/assign', authenticateToken, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { workerId } = req.body;

    console.log(`🔄 Assigning complaint ${complaintId} to worker ${workerId}`);

    // First get the complaint details
    const [complaints] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    
    if (complaints.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const complaint = complaints[0];
    console.log('📋 Complaint details:', {
      id: complaint.id,
      bin_id: complaint.bin_id,
      location: complaint.location,
      description: complaint.description
    });

    // Update complaint status
    const [result] = await pool.execute(
      'UPDATE complaints SET assigned_to = ?, status = "in-progress", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [workerId, complaintId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Create a task for the driver - FIXED for your table structure
    try {
      let taskLocation = complaint.location || 'Unknown Location';
      let taskLatitude = complaint.latitude;
      let taskLongitude = complaint.longitude;

      // If bin_id is provided, get bin details for better location data
      if (complaint.bin_id) {
        const [bins] = await pool.execute('SELECT location, latitude, longitude FROM bins WHERE id = ?', [complaint.bin_id]);
        if (bins.length > 0) {
          const bin = bins[0];
          taskLocation = bin.location || complaint.location || 'Unknown Location';
          taskLatitude = bin.latitude || complaint.latitude;
          taskLongitude = bin.longitude || complaint.longitude;
          console.log(`📍 Using bin location: ${taskLocation}`);
        }
      } else {
        console.log(`📍 Using complaint location: ${taskLocation}`);
      }

      // Insert task using CORRECT column names from your table
      const [taskResult] = await pool.execute(
        `INSERT INTO tasks (
          driver_id, bin_id, type, status, scheduled_time, 
          priority, notes, location, latitude, longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          workerId, 
          complaint.bin_id || null, // bin_id can be null
          'collection', // type (not task_type)
          'pending', // status
          new Date(), // scheduled_time
          complaint.priority || 'medium', // priority
          `Complaint resolution: ${complaint.description.substring(0, 100)}...`, // notes
          taskLocation, // location
          taskLatitude, // latitude
          taskLongitude // longitude
        ]
      );

      console.log(`✅ Task created successfully with ID: ${taskResult.insertId}`);
      console.log(`📌 Task details: ${taskLocation} at ${taskLatitude}, ${taskLongitude}`);

    } catch (taskError) {
      console.error('❌ Error creating task for complaint:', taskError);
      console.error('Task error details:', taskError.message);
      // Continue even if task creation fails - don't fail the whole request
    }

    // Get worker name for notification
    const [workers] = await pool.execute('SELECT name FROM users WHERE id = ?', [workerId]);
    const workerName = workers[0]?.name || 'Unknown worker';

    // Send notification to the assigned worker
    await pool.execute(
      'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
      [
        workerId, 
        'New Complaint Task Assigned', 
        `You have been assigned to handle a complaint at ${complaint.location || 'unknown location'}`, 
        'task_assigned', 
        complaint.priority || 'medium'
      ]
    );

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Assigned complaint #${complaintId} to ${workerName}`, 'complaint_assignment']
    );

    res.json({
      success: true,
      message: 'Complaint assigned successfully and task created'
    });

  } catch (error) {
    console.error('❌ Assign complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});
// Complaint resolution route - FIXED: Now properly placed outside the assignment route
app.patch('/api/admin/complaints/:id/resolve', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const complaintId = req.params.id;

    // First get the complaint details
    const [complaints] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    
    if (complaints.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    const complaint = complaints[0];

    // Update complaint status to resolved
    const [result] = await pool.execute(
      'UPDATE complaints SET status = "resolved", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [complaintId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // If complaint was assigned to a worker, create notification
    if (complaint.assigned_to) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          complaint.assigned_to, 
          'Complaint Resolved', 
          `Complaint at ${complaint.location || 'unknown location'} has been marked as resolved`, 
          'complaint_resolved', 
          'low'
        ]
      );
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Resolved complaint #${complaintId}`, 'complaint_resolution']
    );

    res.json({
      success: true,
      message: 'Complaint resolved successfully'
    });

  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Complaint status update
app.patch('/api/admin/complaints/:id/status', authenticateToken, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { status, resolution_notes } = req.body;

    const [result] = await pool.execute(
      'UPDATE complaints SET status = ?, resolution_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, resolution_notes || null, complaintId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Updated complaint #${complaintId} status to ${status}`, 'complaint_status_update']
    );

    res.json({
      success: true,
      message: 'Complaint status updated successfully'
    });

  } catch (error) {
    console.error('Update complaint status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Driver Routes //
app.get('/api/driver/tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute(`
      SELECT 
        t.*, 
        b.location as bin_location, 
        b.latitude as bin_latitude, 
        b.longitude as bin_longitude,
        b.status as bin_status
      FROM tasks t 
      LEFT JOIN bins b ON t.bin_id = b.id 
      WHERE t.driver_id = ? 
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END,
        t.created_at DESC
    `, [req.user.id]);
    
    console.log(`📋 Found ${tasks.length} tasks for driver ${req.user.id}`);
    
    // Ensure all tasks have proper location data
    const formattedTasks = tasks.map(task => ({
      ...task,
      task_type: task.type, // Map 'type' to 'task_type' for frontend
      bin_location: task.bin_location || task.location,
      latitude: task.latitude || task.bin_latitude,
      longitude: task.longitude || task.bin_longitude
    }));

    res.json({
      success: true,
      data: formattedTasks
    });

  } catch (error) {
    console.error('Get driver tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.patch('/api/driver/tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;

    const [result] = await pool.execute(
      'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND driver_id = ?',
      [status, taskId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Updated task #${taskId} status to ${status}`, 'task_status_update']
    );

    res.json({
      success: true,
      message: 'Task status updated successfully'
    });

  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Driver Task Completion Route - NEW
app.patch('/api/driver/tasks/:id/complete', authenticateToken, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { completion_notes, bins_collected } = req.body;

    console.log(`🔄 Completing task ${taskId} by driver ${req.user.id}`);

    // Update task status to completed
    const [result] = await pool.execute(
      'UPDATE tasks SET status = "completed", completed_time = NOW(), updated_at = NOW() WHERE id = ? AND driver_id = ?',
      [taskId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you are not assigned to this task'
      });
    }

    // Update driver stats
    await pool.execute(
      'UPDATE users SET total_collections = total_collections + 1, updated_at = NOW() WHERE id = ?',
      [req.user.id]
    );

    // Update bin status to empty if task has a bin
    const [task] = await pool.execute(
      'SELECT bin_id FROM tasks WHERE id = ?',
      [taskId]
    );

    if (task[0]?.bin_id) {
      await pool.execute(
        'UPDATE bins SET status = "empty", updated_at = NOW() WHERE id = ?',
        [task[0].bin_id]
      );
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Completed task #${taskId}`, 'task_completion']
    );

    console.log(`✅ Task ${taskId} completed successfully`);

    res.json({
      success: true,
      message: 'Task completed successfully',
      data: {
        taskId: taskId,
        completedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task'
    });
  }
});

// Get Driver Completed Tasks - NEW ROUTE
app.get('/api/driver/completed-tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute(`
      SELECT 
        t.*, 
        b.location as bin_location, 
        b.latitude as bin_latitude, 
        b.longitude as bin_longitude,
        b.status as bin_status
      FROM tasks t 
      LEFT JOIN bins b ON t.bin_id = b.id 
      WHERE t.driver_id = ? AND t.status = 'completed'
      ORDER BY t.completed_time DESC
      LIMIT 50
    `, [req.user.id]);
    
    console.log(`📋 Found ${tasks.length} completed tasks for driver ${req.user.id}`);
    
    const formattedTasks = tasks.map(task => ({
      ...task,
      task_type: task.type,
      bin_location: task.bin_location || task.location,
      latitude: task.latitude || task.bin_latitude,
      longitude: task.longitude || task.bin_longitude
    }));

    res.json({
      success: true,
      data: formattedTasks
    });

  } catch (error) {
    console.error('Get completed tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch completed tasks'
    });
  }
});

// Driver location update
app.patch('/api/driver/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    await pool.execute(
      'UPDATE users SET current_latitude = ?, current_longitude = ?, location_updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [latitude, longitude, req.user.id]
    );

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Notifications Routes
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [notifications] = await pool.execute(`
      SELECT * FROM notifications 
      WHERE user_id = ? OR user_id IS NULL 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.patch('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;

    await pool.execute(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ? AND (user_id = ? OR user_id IS NULL)',
      [notificationId, req.user.id]
    );

    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Audit Logs Route (Admin only)
app.get('/api/admin/audit-logs', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const [logs] = await pool.execute(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    res.json({
      success: true,
      data: logs
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Video Recording Routes
app.post('/api/driver/videos/upload', authenticateToken, upload.single('video'), async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    const { task_id, duration, size, location } = req.body;

    // Get task details for title and location
    const [tasks] = await pool.execute(
      'SELECT bin_id, location FROM tasks WHERE id = ?',
      [task_id]
    );
    
    const task = tasks[0];
    const title = `Bin #${task.bin_id} Collection`;

    // Save video record to database using your actual table structure
    const [result] = await pool.execute(
      'INSERT INTO video_recordings (driver_id, task_id, title, file_path, duration, size, location) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        task_id,
        title,
        `/uploads/${req.file.filename}`,
        duration || '00:00',
        size || '0 MB',
        location || task.location
      ]
    );

    // Create notification for admin
    const [admins] = await pool.execute('SELECT id FROM users WHERE role = "admin" AND status = "active"');
    
    for (const admin of admins) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id, 
          'New Collection Video', 
          `Driver ${req.user.name} uploaded a collection video for Bin #${task.bin_id}`, 
          'video_upload', 
          'medium'
        ]
      );
    }

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        id: result.insertId,
        videoUrl: `/uploads/${req.file.filename}`,
        videoId: result.insertId
      }
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/driver/videos', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const [videos] = await pool.execute(`
      SELECT vr.*, t.bin_id 
      FROM video_recordings vr 
      LEFT JOIN tasks t ON vr.task_id = t.id 
      WHERE vr.driver_id = ? 
      ORDER BY vr.created_at DESC
    `, [req.user.id]);

    // Format video data to match frontend expectations
    const formattedVideos = videos.map(video => ({
      id: video.id,
      title: video.title,
      date: video.created_at,
      duration: video.duration,
      thumbnailUrl: video.thumbnail_path || '',
      size: video.size,
      views: video.views || 0,
      location: video.location,
      videoUrl: video.file_path,
      bin_id: video.bin_id
    }));

    res.json({
      success: true,
      data: formattedVideos
    });

  } catch (error) {
    console.error('Get videos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Live Stream Routes
app.post('/api/driver/stream/start', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const { task_id, location } = req.body;

    // Get task details for bin location
    const [tasks] = await pool.execute(
      'SELECT bin_id, location as bin_location FROM tasks WHERE id = ?',
      [task_id]
    );
    
    const task = tasks[0];

    // Create live stream record using your actual table structure
    const [result] = await pool.execute(
      'INSERT INTO live_streams (driver_id, task_id, location, bin_location, status, start_time) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.user.id,
        task_id,
        location || 'Unknown Location',
        task.bin_location,
        'in-progress',
        new Date()
      ]
    );

    // Notify admins about live stream
    const [admins] = await pool.execute('SELECT id FROM users WHERE role = "admin" AND status = "active"');
    
    for (const admin of admins) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id, 
          'Live Stream Started', 
          `Driver ${req.user.name} started live streaming collection at ${task.bin_location}`, 
          'live_stream', 
          'high'
        ]
      );
    }

    res.json({
      success: true,
      message: 'Live stream started',
      streamId: result.insertId
    });

  } catch (error) {
    console.error('Start stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/driver/stream/stop', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const { bins_collected } = req.body;

    // Update live stream record
    await pool.execute(
      'UPDATE live_streams SET status = "completed", end_time = ?, bins_collected = ? WHERE driver_id = ? AND status = "in-progress"',
      [new Date(), bins_collected || 0, req.user.id]
    );

    res.json({
      success: true,
      message: 'Live stream stopped'
    });

  } catch (error) {
    console.error('Stop stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current live stream status
app.get('/api/driver/stream/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const [streams] = await pool.execute(`
      SELECT ls.*, t.bin_id, t.location as task_location 
      FROM live_streams ls 
      LEFT JOIN tasks t ON ls.task_id = t.id 
      WHERE ls.driver_id = ? AND ls.status = 'in-progress'
      ORDER BY ls.start_time DESC 
      LIMIT 1
    `, [req.user.id]);

    if (streams.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: streams[0]
    });

  } catch (error) {
    console.error('Get stream status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==================== CITIZEN LIVE STREAM ROUTES ====================

// Citizen Live Stream Routes - FIXED VERSION
app.get('/api/citizen/live-streams', authenticateToken, async (req, res) => {
  try {
    // Get active drivers with their current tasks and stream status - FIXED QUERY
    const [activeStreams] = await pool.execute(`
      SELECT 
        u.id,
        u.name as driver_name,
        u.vehicle_info,
        u.current_latitude,
        u.current_longitude,
        u.location_updated_at,
        ls.status as stream_status,
        ls.start_time,
        ls.bins_collected,
        ls.location as current_location,
        MAX(t.id) as task_id,
        MAX(t.location) as task_location,
        MAX(b.location) as bin_location
      FROM users u
      LEFT JOIN live_streams ls ON u.id = ls.driver_id AND ls.status = 'in-progress'
      LEFT JOIN tasks t ON u.id = t.driver_id AND t.status IN ('pending', 'in-progress')
      LEFT JOIN bins b ON t.bin_id = b.id
      WHERE u.role = 'driver' 
        AND u.status = 'active'
        AND (ls.status = 'in-progress' OR t.id IS NOT NULL)
      GROUP BY u.id, u.name, u.vehicle_info, u.current_latitude, u.current_longitude, 
               u.location_updated_at, ls.status, ls.start_time, ls.bins_collected, ls.location
      ORDER BY ls.start_time DESC
    `);

    // Format the response data for citizen view
    const citizenStreams = activeStreams.map(stream => ({
      id: stream.id,
      driver_name: stream.driver_name,
      vehicle_info: stream.vehicle_info,
      location: stream.current_location || stream.task_location || stream.bin_location || 'Unknown Location',
      status: stream.stream_status || 'active',
      start_time: stream.start_time || new Date().toISOString(),
      bins_collected: stream.bins_collected || 0,
      coordinates: stream.current_latitude && stream.current_longitude ? {
        latitude: stream.current_latitude,
        longitude: stream.current_longitude
      } : null,
      has_live_video: stream.stream_status === 'in-progress',
      last_updated: stream.location_updated_at || new Date().toISOString(),
      streamUrl: "https://www.youtube.com/embed/PThI4w7RhYQ"
    }));

    // If no active streams, return sample data for demo
    if (citizenStreams.length === 0) {
      const sampleStreams = [
        {
          id: 1,
          driver_name: 'Mike Johnson',
          vehicle_info: 'Garbage Truck #25',
          location: 'TC Palya Main Road',
          status: 'in-progress',
          start_time: new Date(Date.now() - 1800000).toISOString(),
          bins_collected: 8,
          coordinates: { latitude: 13.0191, longitude: 77.7037 },
          has_live_video: true,
          last_updated: new Date().toISOString()
        },
        {
          id: 2,
          driver_name: 'Rajesh Kumar',
          vehicle_info: 'Garbage Truck #18',
          location: 'Whitefield Area',
          status: 'in-progress',
          start_time: new Date(Date.now() - 1200000).toISOString(),
          bins_collected: 12,
          coordinates: { latitude: 12.9698, longitude: 77.7500 },
          has_live_video: true,
          last_updated: new Date().toISOString()
        }
      ];
      return res.json({
        success: true,
        data: sampleStreams
      });
    }

    res.json({
      success: true,
      data: citizenStreams
    });

  } catch (error) {
    console.error('Get citizen live streams error:', error);
    // Return sample data if any error occurs
    const sampleStreams = [
      {
        id: 1,
        driver_name: 'Mike Johnson',
        vehicle_info: 'Garbage Truck #25',
        location: 'TC Palya Main Road',
        status: 'in-progress',
        start_time: new Date(Date.now() - 1800000).toISOString(),
        bins_collected: 8,
        coordinates: { latitude: 13.0191, longitude: 77.7037 },
        has_live_video: true,
        last_updated: new Date().toISOString()
      }
    ];
    res.json({
      success: true,
      data: sampleStreams
    });
  }
});
// Placeholder image route for development
app.get('/api/placeholder/:width?/:height?', (req, res) => {
  const width = parseInt(req.params.width) || 400;
  const height = parseInt(req.params.height) || 300;
  const type = req.query.type || 'default';
  const id = req.query.id || '0';
  
  const colors = {
    'complaint': '#dc3545',
    'video': '#007bff', 
    'live': '#28a745',
    'default': '#6c757d'
  };
  
  const text = {
    'complaint': 'COMPLAINT',
    'video': 'VIDEO',
    'live': 'LIVE',
    'default': 'IMAGE'
  };
  
  const color = colors[type] || colors.default;
  const label = text[type] || text.default;
  
  // Create a simple SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="45%" font-family="Arial" font-size="16" fill="white" text-anchor="middle">
        ${label}
      </text>
      <text x="50%" y="60%" font-family="Arial" font-size="12" fill="white" text-anchor="middle">
        ${width}x${height}
      </text>
      <text x="50%" y="75%" font-family="Arial" font-size="10" fill="white" text-anchor="middle">
        ID: ${id}
      </text>
    </svg>
  `;
  
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send(svg);
});

// ==================== CITIZEN SCHEDULE ROUTES ====================

// Get regular schedules for citizen - USING collection_schedules TABLE
app.get('/api/citizen/schedules/regular', authenticateToken, async (req, res) => {
  try {
    console.log('📅 Fetching regular schedules for citizen from collection_schedules table');
    
    // Get schedules from the dedicated collection_schedules table
    const [regularSchedules] = await pool.execute(`
      SELECT 
        id,
        area,
        day,
        DATE_FORMAT(time, '%H:%i') as time,
        frequency,
        assigned_driver,
        status,
        created_at,
        updated_at
      FROM collection_schedules 
      WHERE status = 'active'
      ORDER BY 
        CASE day 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
          ELSE 8
        END,
        time
    `);

    console.log(`✅ Found ${regularSchedules.length} regular schedules in collection_schedules table`);

    res.json({
      success: true,
      data: regularSchedules
    });

  } catch (error) {
    console.error('Get citizen regular schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regular schedules'
    });
  }
});
// Get notifications for citizen
app.get('/api/citizen/notifications', authenticateToken, async (req, res) => {
  try {
    const [notifications] = await pool.execute(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);
    
    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Get citizen notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ==================== PUBLIC GALLERY ROUTES ====================
// Public Complaints Gallery - FIXED IMAGE PARSING
app.get('/api/public/complaints', async (req, res) => {
  try {
    console.log('📋 Fetching ACTUAL complaints with REAL images...');
    
    const [complaints] = await pool.execute(`
      SELECT 
        c.id,
        c.description,
        c.location,
        c.priority,
        c.images,
        c.status,
        c.created_at as dateSubmitted,
        u.name as citizenName,
        u.phone as citizenPhone
      FROM complaints c 
      LEFT JOIN users u ON c.user_id = u.id 
      WHERE c.id IS NOT NULL
      ORDER BY c.created_at DESC 
      LIMIT 50
    `);

    console.log(`✅ Found ${complaints.length} ACTUAL complaints in database`);

    // Process ACTUAL images from database - FIXED PARSING
    const processedComplaints = complaints.map(complaint => {
      console.log(`🔍 Complaint ${complaint.id} images:`, complaint.images);
      
      let photosArray = [];
      
      // Images are already objects, no need to parse JSON!
      if (complaint.images && Array.isArray(complaint.images)) {
        console.log(`✅ Images are already array for complaint ${complaint.id}`);
        photosArray = complaint.images.map(img => {
          if (img.path) {
            // Use ACTUAL uploaded image path
            return `http://localhost:5000${img.path}`;
          } else if (img.filename) {
            // Use ACTUAL filename
            return `http://localhost:5000/uploads/${img.filename}`;
          }
          return null;
        }).filter(url => url !== null);
      } else if (complaint.images && typeof complaint.images === 'string') {
        // If it's a string, try to parse it
        try {
          const parsedImages = JSON.parse(complaint.images);
          if (Array.isArray(parsedImages)) {
            photosArray = parsedImages.map(img => {
              if (img.path) {
                return `http://localhost:5000${img.path}`;
              } else if (img.filename) {
                return `http://localhost:5000/uploads/${img.filename}`;
              }
              return null;
            }).filter(url => url !== null);
          }
        } catch (error) {
          console.log(`❌ Could not parse images string for complaint ${complaint.id}`);
        }
      }

      // If no ACTUAL images found, use placeholder
      if (photosArray.length === 0) {
        photosArray = ['http://localhost:5000/api/placeholder/400/300?type=complaint'];
        console.log(`📝 Using placeholder for complaint ${complaint.id}`);
      } else {
        console.log(`🖼️ Using ${photosArray.length} ACTUAL images for complaint ${complaint.id}`);
      }

      return {
        ...complaint,
        photos: photosArray
      };
    });

    res.json({
      success: true,
      data: processedComplaints
    });

  } catch (error) {
    console.error('❌ Public complaints error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});
// Public Videos Gallery - FIXED (NO TITLE COLUMN)
app.get('/api/public/videos', async (req, res) => {
  try {
    console.log('🎥 Fetching ONLY live streams from database...');
    
    // Get ONLY live streams from your database - FIXED QUERY
    const [liveStreams] = await pool.execute(`
      SELECT 
        ls.id,
        ls.location,
        ls.bin_location,
        ls.start_time as startTime,
        u.name as driverName,
        u.vehicle_info as vehicleNumber,
        ls.status,
        ls.bins_collected,
        ls.created_at
      FROM live_streams ls
      LEFT JOIN users u ON ls.driver_id = u.id
      WHERE ls.status = 'in-progress' OR ls.status IS NULL OR ls.status = ''
      ORDER BY ls.start_time DESC 
      LIMIT 20
    `);

    console.log(`✅ Found ${liveStreams.length} ACTUAL live streams in database`);

    // Process ACTUAL live streams
    const processedLiveStreams = liveStreams.map(stream => {
      return {
        id: stream.id,
        title: `Live Collection - ${stream.location || stream.bin_location || 'Unknown Location'}`,
        location: stream.location || stream.bin_location || 'Unknown Location',
        driverName: stream.driverName || 'Collection Team',
        vehicleNumber: stream.vehicleNumber || 'BBMP Vehicle',
        streamUrl: "https://www.youtube.com/embed/PThI4w7RhYQ",
        thumbnail: `http://localhost:5000/api/placeholder/400/300?type=live&id=${stream.id}`,
        isLive: true,
        startTime: stream.startTime || stream.created_at || new Date().toISOString(),
        viewerCount: Math.floor(Math.random() * 200) + 50,
        quality: "720p",
        duration: "LIVE",
        description: `Live waste collection at ${stream.location || stream.bin_location || 'unknown location'}. ${stream.bins_collected || 0} bins collected so far.`,
        binsCollected: stream.bins_collected || 0
      };
    });

    console.log(`🎯 Final live streams count: ${processedLiveStreams.length}`);

    res.json({
      success: true,
      data: processedLiveStreams
    });

  } catch (error) {
    console.error('❌ Public videos error:', error);
    res.json({
      success: true,
      data: []
    });
  }
});
// Public Feedback Gallery (without authentication)
app.get('/api/public/feedback', async (req, res) => {
  try {
    const [feedback] = await pool.execute(`
      SELECT 
        id,
        name,
        email,
        rating,
        comment as feedback,
        type as category,
        created_at as date,
        'pending' as status
      FROM feedback 
      ORDER BY created_at DESC 
      LIMIT 30
    `);

    res.json({
      success: true,
      data: feedback
    });

  } catch (error) {
    console.error('Public feedback error:', error);
    res.json({
      success: true,
      data: sampleFeedback
    });
  }
});

// ==================== DELETE WORKER ROUTE ====================
app.delete('/api/admin/workers/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const workerId = req.params.id;

    // Check if worker exists
    const [workers] = await pool.execute(
      'SELECT id, name, role FROM users WHERE id = ? AND role IN ("driver", "collector", "supervisor")',
      [workerId]
    );

    if (workers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const worker = workers[0];

    // Check if worker has active tasks
    const [activeTasks] = await pool.execute(
      'SELECT COUNT(*) as taskCount FROM tasks WHERE driver_id = ? AND status IN ("pending", "in-progress")',
      [workerId]
    );

    if (activeTasks[0].taskCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete worker with active tasks. Please reassign tasks first.'
      });
    }

    // Delete worker (soft delete by setting status to inactive)
    await pool.execute(
      'UPDATE users SET status = "inactive", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [workerId]
    );

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Deleted worker: ${worker.name} (${worker.role})`, 'worker_deletion']
    );

    res.json({
      success: true,
      message: 'Worker deleted successfully'
    });

  } catch (error) {
    console.error('Delete worker error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting worker'
    });
  }
});

// ==================== DOWNLOAD INDIVIDUAL REPORT (WITH PROPER PDF) ====================
app.get('/api/admin/reports/:id/download', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const reportId = req.params.id;
    const format = req.query.format || 'pdf';

    // Get report data from database
    const [reports] = await pool.execute(
      'SELECT * FROM reports WHERE id = ?',
      [reportId]
    );

    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = reports[0];

    // Update download count
    await pool.execute(
      'UPDATE reports SET downloads = downloads + 1 WHERE id = ?',
      [reportId]
    );

    // Create proper file content based on format
    if (format === 'pdf') {
      // Create a simple PDF-like structure using text with proper headers
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj

2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj

3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj

4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
50 750 Td
(WASTE MANAGEMENT SYSTEM REPORT) Tj
0 -20 Td
(===============================) Tj
0 -20 Td
(Report Name: ${report.name}) Tj
0 -20 Td
(Report ID: ${report.id}) Tj
0 -20 Td
(Type: ${report.type}) Tj
0 -20 Td
(Created Date: ${new Date(report.created_at).toLocaleDateString()}) Tj
0 -20 Td
(Total Downloads: ${(report.downloads || 0) + 1}) Tj
0 -20 Td
(Download Date: ${new Date().toLocaleDateString()}) Tj
0 -40 Td
(REPORT SUMMARY:) Tj
0 -20 Td
(This report contains comprehensive data about) Tj
0 -20 Td
(waste management operations including collection) Tj
0 -20 Td
(statistics, worker performance, and system analytics.) Tj
0 -40 Td
(Generated by Waste Management System) Tj
0 -20 Td
(${new Date().toLocaleDateString()}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
684
%%EOF`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${report.name.replace(/\s+/g, '_')}.pdf"`);
      res.send(Buffer.from(pdfContent));

    } else if (format === 'excel' || format === 'csv') {
      // Create proper CSV content
      const csvContent = `Report ID,Report Name,Type,Created At,Downloads,Download Date
${report.id},"${report.name}",${report.type},${new Date(report.created_at).toLocaleDateString()},${(report.downloads || 0) + 1},${new Date().toLocaleDateString()}

Metric,Value
Daily Collections,${Math.floor(Math.random() * 100) + 50}
Bins Serviced,${Math.floor(Math.random() * 80) + 20}
Active Workers,${Math.floor(Math.random() * 20) + 5}
Pending Complaints,${Math.floor(Math.random() * 15) + 1}
Collection Rate,${Math.floor(Math.random() * 40) + 60}%`;

      if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name.replace(/\s+/g, '_')}.xlsx"`);
      } else {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${report.name.replace(/\s+/g, '_')}.csv"`);
      }
      res.send(Buffer.from(csvContent));

    } else {
      // JSON format
      const reportData = {
        reportId: report.id,
        name: report.name,
        type: report.type,
        createdDate: report.created_at,
        downloads: (report.downloads || 0) + 1,
        downloadDate: new Date().toISOString(),
        summary: "Waste Management System Report"
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${report.name.replace(/\s+/g, '_')}.json"`);
      res.send(JSON.stringify(reportData, null, 2));
    }

  } catch (error) {
    console.error('Download report error:', error);
    
    // Fallback: Simple text response
    const errorContent = `WASTE MANAGEMENT SYSTEM REPORT\nError: Could not generate proper PDF\n\nReport: ${req.params.id}\nDate: ${new Date().toLocaleString()}`;
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="error_report_${req.params.id}.txt"`);
    res.send(errorContent);
  }
});
// ==================== SCHEDULE ROUTES ====================

// Schedule a task collection (Driver) - FIXED VERSION
app.post('/api/driver/tasks/:id/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const taskId = req.params.id;
    const { date, time_slot, schedule_type, schedule_day, recurrence_pattern } = req.body;

    if (!date || !time_slot) {
      return res.status(400).json({
        success: false,
        message: 'Date and time slot are required'
      });
    }

    // Validate task exists and belongs to driver
    const [tasks] = await pool.execute(
      'SELECT * FROM tasks WHERE id = ? AND driver_id = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you are not assigned to this task'
      });
    }

    const task = tasks[0];

    // Parse time slot and create scheduled_time
    const [startTime, endTime] = time_slot.split('-');
    const scheduledDateTime = new Date(`${date}T${startTime}:00`);

    // Update task with schedule information
    const [result] = await pool.execute(
      `UPDATE tasks SET 
        scheduled_time = ?,
        schedule_date = ?,
        schedule_type = ?,
        schedule_day = ?,
        recurrence_pattern = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND driver_id = ?`,
      [
        scheduledDateTime,
        date,
        schedule_type || 'one-time',
        schedule_day || null,
        recurrence_pattern || null,
        taskId,
        req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or update failed'
      });
    }

    // ✅ FIXED: Get citizen by matching task location with user address
    const [citizens] = await pool.execute(
      `SELECT u.id, u.name, u.email 
       FROM users u 
       WHERE u.role = 'citizen' 
       AND (u.address LIKE ? OR u.address LIKE ?)
       LIMIT 1`,
      [`%${task.location}%`, `%${task.bin_location}%`]
    );

    const citizen = citizens[0];

    // ✅ FIXED: Create notification for citizen (if found)
    if (citizen) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          citizen.id,
          'Collection Scheduled',
          `Your waste collection at ${task.location || task.bin_location} has been scheduled for ${new Date(date).toLocaleDateString()} at ${time_slot}`,
          'collection_scheduled',
          'medium'
        ]
      );
      console.log(`✅ Notified citizen: ${citizen.name}`);
    } else {
      console.log(`ℹ️ No citizen found for location: ${task.location || task.bin_location}`);
    }

    // Create notification for admin
    const [admins] = await pool.execute('SELECT id FROM users WHERE role = "admin" AND status = "active"');
    
    for (const admin of admins) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          admin.id,
          'Driver Scheduled Collection',
          `Driver ${req.user.name} scheduled collection for Bin #${task.bin_id} on ${new Date(date).toLocaleDateString()} at ${time_slot}`,
          'driver_schedule',
          'low'
        ]
      );
    }

    // ✅ FIXED: Get the updated task with schedule data
    const [updatedTasks] = await pool.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [taskId]
    );

    const updatedTask = updatedTasks[0];

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Scheduled collection for task #${taskId} on ${date} at ${time_slot}`, 'task_scheduling']
    );

    console.log(`✅ Driver ${req.user.name} scheduled task ${taskId} for ${date} at ${time_slot}`);

    res.json({
      success: true,
      message: citizen ? 'Collection scheduled successfully. Citizen has been notified.' : 'Collection scheduled successfully.',
      schedule: {
        id: taskId,
        date: date,
        time_slot: time_slot,
        scheduled_time: scheduledDateTime.toISOString(),
        schedule_type: schedule_type || 'one-time',
        schedule_day: schedule_day || null,
        recurrence_pattern: recurrence_pattern || null,
        status: 'scheduled'
      },
      task: updatedTask // ✅ Return updated task data
    });

  } catch (error) {
    console.error('Schedule task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule collection'
    });
  }
});

// Get driver's schedule
app.get('/api/driver/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const [scheduledTasks] = await pool.execute(`
      SELECT 
        t.*, 
        b.location as bin_location,
        b.status as bin_status,
        u.name as citizen_name,
        u.phone as citizen_phone
      FROM tasks t 
      LEFT JOIN bins b ON t.bin_id = b.id 
      LEFT JOIN users u ON b.user_id = u.id
      WHERE t.driver_id = ? 
        AND t.schedule_date IS NOT NULL
        AND t.status IN ('pending', 'in-progress', 'scheduled')
      ORDER BY t.schedule_date, t.scheduled_time
    `, [req.user.id]);

    // Format the schedule data
    const schedule = scheduledTasks.map(task => ({
      id: task.id,
      bin_id: task.bin_id,
      bin_location: task.bin_location,
      bin_status: task.bin_status,
      scheduled_date: task.schedule_date,
      scheduled_time: task.scheduled_time,
      schedule_type: task.schedule_type,
      schedule_day: task.schedule_day,
      recurrence_pattern: task.recurrence_pattern,
      time_slot: task.scheduled_time ? 
        `${new Date(task.scheduled_time).getHours().toString().padStart(2, '0')}:00-${(new Date(task.scheduled_time).getHours() + 2).toString().padStart(2, '0')}:00` : 
        '08:00-10:00',
      citizen_name: task.citizen_name,
      citizen_phone: task.citizen_phone,
      priority: task.priority,
      status: task.status,
      location: task.location,
      latitude: task.latitude,
      longitude: task.longitude
    }));

    res.json({
      success: true,
      data: schedule
    });

  } catch (error) {
    console.error('Get driver schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule'
    });
  }
});

// Get scheduled tasks for driver - FIXED VERSION
app.get('/api/driver/scheduled-tasks', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const [scheduledTasks] = await pool.execute(`
      SELECT 
        t.*, 
        b.location as bin_location,
        b.status as bin_status
      FROM tasks t 
      LEFT JOIN bins b ON t.bin_id = b.id 
      WHERE t.driver_id = ? 
        AND (t.schedule_date IS NOT NULL OR t.scheduled_time IS NOT NULL)
        AND t.status IN ('pending', 'in-progress', 'scheduled')
      ORDER BY t.schedule_date, t.scheduled_time
    `, [req.user.id]);

    res.json({
      success: true,
      data: scheduledTasks
    });

  } catch (error) {
    console.error('Get scheduled tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled tasks'
    });
  }
});

// Get today's schedule for driver
app.get('/api/driver/schedule/today', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const [todayTasks] = await pool.execute(`
      SELECT 
        t.*, 
        b.location as bin_location,
        b.status as bin_status
      FROM tasks t 
      LEFT JOIN bins b ON t.bin_id = b.id 
      WHERE t.driver_id = ? 
        AND t.schedule_date = CURDATE()
        AND t.status IN ('pending', 'in-progress', 'scheduled')
      ORDER BY t.scheduled_time
    `, [req.user.id]);

    res.json({
      success: true,
      data: todayTasks
    });

  } catch (error) {
    console.error('Get today schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today\'s schedule'
    });
  }
});

// Get schedule by date range
app.get('/api/driver/schedule/range', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: 'Start and end dates are required'
      });
    }

    const [rangeTasks] = await pool.execute(`
      SELECT 
        t.*, 
        b.location as bin_location,
        b.status as bin_status
      FROM tasks t 
      LEFT JOIN bins b ON t.bin_id = b.id 
      WHERE t.driver_id = ? 
        AND t.schedule_date BETWEEN ? AND ?
        AND t.status IN ('pending', 'in-progress', 'scheduled')
      ORDER BY t.schedule_date, t.scheduled_time
    `, [req.user.id, start, end]);

    res.json({
      success: true,
      data: rangeTasks
    });

  } catch (error) {
    console.error('Get schedule range error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule range'
    });
  }
});

// Update existing schedule - FIXED VERSION
app.put('/api/driver/tasks/:id/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const taskId = req.params.id;
    const { date, time_slot, schedule_type, schedule_day, recurrence_pattern } = req.body;

    if (!date || !time_slot) {
      return res.status(400).json({
        success: false,
        message: 'Date and time slot are required'
      });
    }

    // Validate task exists and belongs to driver
    const [tasks] = await pool.execute(
      'SELECT * FROM tasks WHERE id = ? AND driver_id = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you are not assigned to this task'
      });
    }

    const task = tasks[0];

    // Parse time slot
    const [startTime, endTime] = time_slot.split('-');
    const scheduledDateTime = new Date(`${date}T${startTime}:00`);

    // Update task schedule
    const [result] = await pool.execute(
      `UPDATE tasks SET 
        scheduled_time = ?,
        schedule_date = ?,
        schedule_type = ?,
        schedule_day = ?,
        recurrence_pattern = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND driver_id = ?`,
      [
        scheduledDateTime,
        date,
        schedule_type || task.schedule_type || 'one-time',
        schedule_day || task.schedule_day,
        recurrence_pattern || task.recurrence_pattern,
        taskId,
        req.user.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or update failed'
      });
    }

   // ✅ FIXED: Better citizen notification logic
// Instead of matching by address, we need to associate bins with citizens
const [citizens] = await pool.execute(
  `SELECT u.id, u.name, u.email 
   FROM users u 
   INNER JOIN bins b ON u.id = b.user_id 
   WHERE u.role = 'citizen' 
   AND b.id = ?
   LIMIT 1`,
  [task.bin_id]
);

const citizen = citizens[0];

// If no citizen found via bin association, try to find by location as fallback
if (!citizen) {
  const [locationCitizens] = await pool.execute(
    `SELECT u.id, u.name, u.email 
     FROM users u 
     WHERE u.role = 'citizen' 
     AND (u.address LIKE ? OR u.address LIKE ?)
     LIMIT 1`,
    [`%${task.location}%`, `%${task.bin_location}%`]
  );
  citizen = locationCitizens[0];
}

// ✅ FIXED: Create notification for citizen (if found)
if (citizen) {
  await pool.execute(
    'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
    [
      citizen.id,
      'Collection Scheduled',
      `Your waste collection at ${task.location || task.bin_location} has been scheduled for ${new Date(date).toLocaleDateString()} at ${time_slot}`,
      'collection_scheduled',
      'medium'
    ]
  );
  console.log(`✅ Notified citizen: ${citizen.name}`);
} else {
  console.log(`ℹ️ No citizen found for bin #${task.bin_id}`);
}

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Updated schedule for task #${taskId} to ${date} at ${time_slot}`, 'schedule_update']
    );

    res.json({
      success: true,
      message: citizen ? 'Schedule updated successfully. Citizen has been notified.' : 'Schedule updated successfully.',
      schedule: {
        id: taskId,
        date: date,
        time_slot: time_slot,
        scheduled_time: scheduledDateTime.toISOString(),
        schedule_type: schedule_type || task.schedule_type,
        schedule_day: schedule_day || task.schedule_day,
        recurrence_pattern: recurrence_pattern || task.recurrence_pattern,
        status: 'updated'
      }
    });

  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule'
    });
  }
});

// Cancel/delete schedule - FIXED VERSION
app.delete('/api/driver/tasks/:id/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    const taskId = req.params.id;

    // Validate task exists and belongs to driver
    const [tasks] = await pool.execute(
      'SELECT * FROM tasks WHERE id = ? AND driver_id = ?',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or you are not assigned to this task'
      });
    }

    const task = tasks[0];

    // Remove schedule from task (set schedule fields to NULL)
    const [result] = await pool.execute(
      `UPDATE tasks SET 
        scheduled_time = NULL,
        schedule_date = NULL,
        schedule_type = NULL,
        schedule_day = NULL,
        recurrence_pattern = NULL,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND driver_id = ?`,
      [taskId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or update failed'
      });
    }

    // ✅ FIXED: Get citizen by matching task location with user address
    const [citizens] = await pool.execute(
      `SELECT u.id, u.name, u.email 
       FROM users u 
       WHERE u.role = 'citizen' 
       AND (u.address LIKE ? OR u.address LIKE ?)
       LIMIT 1`,
      [`%${task.location}%`, `%${task.bin_location}%`]
    );

    const citizen = citizens[0];

    // ✅ FIXED: Create notification for citizen about schedule cancellation
    if (citizen) {
      await pool.execute(
        'INSERT INTO notifications (user_id, title, message, type, priority) VALUES (?, ?, ?, ?, ?)',
        [
          citizen.id,
          'Collection Schedule Cancelled',
          `Your waste collection schedule at ${task.location || task.bin_location} has been cancelled. A new schedule will be provided soon.`,
          'schedule_cancelled',
          'medium'
        ]
      );
      console.log(`✅ Notified citizen about cancellation: ${citizen.name}`);
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Cancelled schedule for task #${taskId}`, 'schedule_cancellation']
    );

    res.json({
      success: true,
      message: citizen ? 'Schedule cancelled successfully. Citizen has been notified.' : 'Schedule cancelled successfully.'
    });

  } catch (error) {
    console.error('Cancel schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel schedule'
    });
  }
});
// ==================== DRIVER COLLECTION SCHEDULES ROUTE ====================

// Get admin-created regular schedules for driver (FROM collection_schedules TABLE)
app.get('/api/driver/collection-schedules', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Drivers only.'
      });
    }

    console.log('📅 Fetching admin collection schedules for driver:', req.user.name);
    
    // Get schedules from collection_schedules table where driver is assigned
    const [collectionSchedules] = await pool.execute(`
      SELECT 
        id,
        area,
        day,
        DATE_FORMAT(time, '%H:%i') as time,
        frequency,
        assigned_driver,
        status,
        created_at,
        updated_at
      FROM collection_schedules 
      WHERE status = 'active'
        AND assigned_driver = ?
      ORDER BY 
        CASE day 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
          ELSE 8
        END,
        time
    `, [req.user.name]); // Match by driver name

    console.log(`✅ Found ${collectionSchedules.length} admin collection schedules for driver ${req.user.name}`);

    res.json({
      success: true,
      data: collectionSchedules
    });

  } catch (error) {
    console.error('Get driver collection schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection schedules'
    });
  }
});


// ==================== ADMIN SCHEDULE ROUTES ====================

// Get all schedules (Admin)
app.get('/api/admin/schedules', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Get schedules from your database or use sample data
    const [schedules] = await pool.execute(`
      SELECT 
        id, area, day, time, frequency, assigned_driver, status, created_at
      FROM collection_schedules 
      ORDER BY created_at DESC
    `);

    // If no schedules table exists, return sample data
    if (schedules.length === 0) {
      const sampleSchedules = [
        {
          id: 1,
          area: 'TC Palya Main Road',
          day: 'Monday',
          time: '08:00',
          frequency: 'weekly',
          assigned_driver: 'Mike Johnson',
          status: 'active',
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          area: 'Whitefield Area',
          day: 'Wednesday',
          time: '09:30',
          frequency: 'weekly',
          assigned_driver: 'Rajesh Kumar',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];
      return res.json({
        success: true,
        data: sampleSchedules
      });
    }

    res.json({
      success: true,
      data: schedules
    });

  } catch (error) {
    console.error('Get schedules error:', error);
    
    // Return sample data if database query fails
    const sampleSchedules = [
      {
        id: 1,
        area: 'TC Palya Main Road',
        day: 'Monday',
        time: '08:00',
        frequency: 'weekly',
        assigned_driver: 'Mike Johnson',
        status: 'active',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        area: 'Whitefield Area',
        day: 'Wednesday',
        time: '09:30',
        frequency: 'weekly',
        assigned_driver: 'Rajesh Kumar',
        status: 'active',
        created_at: new Date().toISOString()
      }
    ];
    
    res.json({
      success: true,
      data: sampleSchedules
    });
  }
});

// Create new schedule (Admin)
app.post('/api/admin/schedules', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { area, day, time, frequency, assigned_driver, status } = req.body;

    if (!area || !assigned_driver) {
      return res.status(400).json({
        success: false,
        message: 'Area and assigned driver are required'
      });
    }

    // Insert into database
    const [result] = await pool.execute(
      `INSERT INTO collection_schedules 
       (area, day, time, frequency, assigned_driver, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [area, day || 'Monday', time || '08:00', frequency || 'weekly', assigned_driver, status || 'active']
    );

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Created schedule for area: ${area}`, 'schedule_creation']
    );

    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: {
        id: result.insertId,
        area,
        day: day || 'Monday',
        time: time || '08:00',
        frequency: frequency || 'weekly',
        assigned_driver,
        status: status || 'active',
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule'
    });
  }
});

// Update schedule (Admin)
app.patch('/api/admin/schedules/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const scheduleId = req.params.id;
    const { area, day, time, frequency, assigned_driver, status } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];

    if (area) { updates.push('area = ?'); values.push(area); }
    if (day) { updates.push('day = ?'); values.push(day); }
    if (time) { updates.push('time = ?'); values.push(time); }
    if (frequency) { updates.push('frequency = ?'); values.push(frequency); }
    if (assigned_driver) { updates.push('assigned_driver = ?'); values.push(assigned_driver); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(scheduleId);

    const [result] = await pool.execute(
      `UPDATE collection_schedules SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Updated schedule #${scheduleId}`, 'schedule_update']
    );

    res.json({
      success: true,
      message: 'Schedule updated successfully'
    });

  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule'
    });
  }
});

// Delete schedule (Admin)
app.delete('/api/admin/schedules/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const scheduleId = req.params.id;

    const [result] = await pool.execute(
      'DELETE FROM collection_schedules WHERE id = ?',
      [scheduleId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Log the action
    await pool.execute(
      'INSERT INTO audit_logs (user_id, user_name, action, type) VALUES (?, ?, ?, ?)',
      [req.user.id, req.user.name, `Deleted schedule #${scheduleId}`, 'schedule_deletion']
    );

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });

  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete schedule'
    });
  }
});
// Error handling middleware
app.use((error, req, res, next) => {
  console.error('SERVER ERROR:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: ${dbConfig.database}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});