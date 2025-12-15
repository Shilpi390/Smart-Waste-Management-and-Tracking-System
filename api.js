import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with better error handling
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout to 15 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // Don't set Content-Type for FormData - let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Enhanced response interceptor with better error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response Success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });

    // Handle different types of errors
    let errorMessage = 'An unexpected error occurred';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout - Server is not responding';
    } else if (error.code === 'NETWORK_ERROR' || !error.response) {
      errorMessage = 'Network error - Cannot connect to server. Please check if the backend is running.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed';
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    } else if (error.response?.status === 404) {
      errorMessage = 'Requested resource not found';
    } else if (error.response?.status === 500) {
      errorMessage = 'Server error - Please try again later';
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else {
      errorMessage = error.message || 'Unknown error occurred';
    }

    console.error(' Final Error Message:', errorMessage);

    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      code: error.code
    });
  }
);

// Auth API calls
export const authAPI = {
  login: (credentials) => {
    console.log('🔐 Login attempt:', credentials.email);
    return api.post('/auth/login', credentials);
  },
  register: (userData) => {
    console.log('👤 Registration attempt:', userData.email, userData.role);
    return api.post('/auth/register', userData);
  },
  logout: () => {
    console.log('🚪 Logout attempt');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return api.post('/auth/logout');
  },
  // Forgot password method
  forgotPassword: (data) => {
    console.log('🔑 Forgot password request:', data.email);
    return api.post('/auth/forgot-password', data);
  },
  // Reset password method
  resetPassword: (data) => {
    console.log('🔄 Reset password request with token');
    return api.post('/auth/reset-password', data);
  }
};

// Citizen API calls
export const citizenAPI = {
  getProfile: () => {
    console.log('👤 Fetching citizen profile');
    return api.get('/citizen/profile');
  },
  updateProfile: (profileData) => {
    console.log('✏️ Updating citizen profile');
    return api.put('/citizen/profile', profileData);
  },
  
  // NEW: Schedule functions for Citizen
  getRegularSchedules: () => {
    console.log('📅 Fetching regular schedules for citizen');
    return api.get('/citizen/schedules/regular');
  },
  getTaskSchedules: () => {
    console.log('📋 Fetching task schedules for citizen');
    return api.get('/citizen/schedules/tasks');
  },
   getNotifications: () => {
    console.log('🔔 Fetching citizen notifications');
    return api.get('/citizen/notifications');
  },
};

// Complaints API calls
export const complaintsAPI = {
  getByUser: () => {
    console.log('📋 Fetching user complaints');
    return api.get('/complaints/user');
  },
  
  create: (formData) => {
    console.log('📝 Creating complaint with FormData');
    return api.post('/complaints', formData);
  },
};

// Bins API calls
export const binsAPI = {
  getAll: () => {
    console.log('🗑️ Fetching all bins');
    return api.get('/bins');
  },
};

// Drivers API calls
export const driversAPI = {
  getAll: () => {
    console.log('🚚 Fetching all drivers');
    return api.get('/users/drivers');
  },
};

// Notifications API calls
export const notificationsAPI = {
  getByUser: () => {
    console.log('🔔 Fetching user notifications');
    return api.get('/notifications');
  },
};

// Feedback API calls
export const feedbackAPI = {
  create: (feedbackData) => {
    console.log('💬 Submitting feedback:', feedbackData);
    return api.post('/feedback', feedbackData);
  },
  
  // Optional: Get feedback (admin only)
  getAll: () => {
    console.log('📋 Fetching all feedback');
    return api.get('/admin/feedback');
  }
};

// Video API calls
export const videoAPI = {
  // Upload video recording
  uploadVideoRecording: (formData) => {
    console.log('🎥 Uploading video recording');
    return api.post('/driver/videos/upload', formData);
  },

  // Get video recordings
  getVideoRecordings: () => {
    console.log('📹 Fetching video recordings');
    return api.get('/driver/videos');
  },

  // Start video stream
  startVideoStream: (taskId, location) => {
    console.log('🔴 Starting video stream for task:', taskId);
    return api.post('/driver/stream/start', {
      task_id: taskId,
      location: location
    });
  },

  // Stop video stream
  stopVideoStream: (binsCollected = 0) => {
    console.log('⏹️ Stopping video stream, bins collected:', binsCollected);
    return api.post('/driver/stream/stop', {
      bins_collected: binsCollected
    });
  },

  // Get stream status
  getStreamStatus: () => {
    console.log('📊 Getting stream status');
    return api.get('/driver/stream/status');
  }
};

// Live Stream API calls for Citizen
export const liveStreamAPI = {
  // Get active live streams for citizen view
  getActiveStreams: () => {
    console.log('📹 Fetching active live streams for citizen');
    return api.get('/citizen/live-streams');
  },

  // Get driver's current stream status
  getDriverStreamStatus: (driverId) => {
    console.log(`📊 Getting stream status for driver ${driverId}`);
    return api.get(`/citizen/driver/${driverId}/stream-status`);
  },

  // Watch specific driver's live stream
  watchDriverStream: (driverId) => {
    console.log(`👀 Watching live stream for driver ${driverId}`);
    return api.post(`/citizen/driver/${driverId}/watch-stream`);
  }
};

// ==================== WORKER DELETE & REPORT DOWNLOAD API ====================

// Admin API calls
export const adminAPI = {
  // Delete worker
  deleteWorker: (workerId) => {
    console.log('🗑️ Deleting worker:', workerId);
    return api.delete(`/admin/workers/${workerId}`);
  },

  // Add new worker
  addWorker: (workerData) => {
    console.log('👤 Adding new worker:', workerData);
    return api.post('/admin/workers', workerData);
  },

  // Get all live streams (not limited to 3)
  getAllLiveStreams: () => {
    console.log('📹 Fetching ALL live streams for admin');
    return api.get('/admin/all-live-streams');
  },

  // Download individual report
  downloadReport: (reportId, format = 'pdf') => {
    console.log('📥 Downloading individual report:', reportId, format);
    return api.get(`/admin/reports/${reportId}/download?format=${format}`, {
      responseType: 'blob' // Important for file downloads
    });
  },

  // Existing methods (make sure these are there)
  getDashboardStats: () => {
    console.log('📊 Fetching admin dashboard stats');
    return api.get('/admin/dashboard/stats');
  },

  getWorkers: () => {
    console.log('👥 Fetching workers');
    return api.get('/admin/workers');
  },

  getBins: () => {
    console.log('🗑️ Fetching bins');
    return api.get('/admin/bins');
  },

  getReports: () => {
    console.log('📄 Fetching reports');
    return api.get('/admin/reports');
  },

  getLiveStreams: () => {
    console.log('📹 Fetching live streams');
    return api.get('/admin/live-streams');
  },

  // NEW: Admin Schedule APIs
  getSchedules: () => {
    console.log('📅 Fetching admin schedules');
    return api.get('/admin/schedules');
  },

  createSchedule: (scheduleData) => {
    console.log('➕ Creating new schedule:', scheduleData);
    return api.post('/admin/schedules', scheduleData);
  },

  updateSchedule: (scheduleId, updateData) => {
    console.log('✏️ Updating schedule:', scheduleId);
    return api.patch(`/admin/schedules/${scheduleId}`, updateData);
  },

  deleteSchedule: (scheduleId) => {
    console.log('🗑️ Deleting schedule:', scheduleId);
    return api.delete(`/admin/schedules/${scheduleId}`);
  },

  getAvailableDrivers: () => {
    console.log('👥 Fetching available drivers for scheduling');
    return api.get('/admin/available-drivers');
  },

  getScheduleStats: () => {
    console.log('📊 Fetching schedule statistics');
    return api.get('/admin/schedules/stats');
  }
};

// ==================== DELETE WORKER UTILITY ====================
export const deleteWorker = async (workerId, workerName) => {
  try {
    console.log(`🗑️ Attempting to delete worker: ${workerName} (ID: ${workerId})`);
    
    const response = await adminAPI.deleteWorker(workerId);
    
    console.log(`✅ Successfully deleted worker: ${workerName}`);
    return {
      success: true,
      message: response.data.message || 'Worker deleted successfully'
    };
  } catch (error) {
    console.error(`❌ Error deleting worker:`, error);
    return {
      success: false,
      message: error.message || 'Failed to delete worker'
    };
  }
};

// Driver Schedule API calls
export const scheduleAPI = {
  // Schedule a task collection
  scheduleTask: (taskId, scheduleData) => {
    console.log('📅 Scheduling task:', taskId, scheduleData);
    return api.post(`/driver/tasks/${taskId}/schedule`, scheduleData);
  },
  // NEW: Get admin collection schedules for driver
  getCollectionSchedules: () => {
    console.log('📅 Fetching admin collection schedules for driver');
    return api.get('/driver/collection-schedules');
  },

  // Get driver's schedule
  getDriverSchedule: () => {
    console.log('📋 Fetching driver schedule');
    return api.get('/driver/schedule');
  },

  // Get scheduled tasks
  getScheduledTasks: () => {
    console.log('📝 Fetching scheduled tasks');
    return api.get('/driver/scheduled-tasks');
  },

  // Get today's schedule
  getTodaySchedule: () => {
    console.log('📅 Fetching today\'s schedule');
    return api.get('/driver/schedule/today');
  },

  // Get schedule by date range
  getScheduleByRange: (startDate, endDate) => {
    console.log('📊 Fetching schedule by range:', startDate, 'to', endDate);
    return api.get(`/driver/schedule/range?start=${startDate}&end=${endDate}`);
  },

  // Update existing schedule
  updateSchedule: (taskId, scheduleData) => {
    console.log('🔄 Updating schedule for task:', taskId);
    return api.put(`/driver/tasks/${taskId}/schedule`, scheduleData);
  },

  // Cancel/delete schedule
  cancelSchedule: (taskId) => {
    console.log('❌ Canceling schedule for task:', taskId);
    return api.delete(`/driver/tasks/${taskId}/schedule`);
  },

  // Send schedule notification to citizen
  sendScheduleNotification: (taskId, notificationData) => {
    console.log('🔔 Sending schedule notification for task:', taskId);
    return api.post(`/driver/tasks/${taskId}/notify`, notificationData);
  }
};

// Admin Regular Schedule API calls
export const regularScheduleAPI = {
  // Create regular schedule (Admin)
  createRegularSchedule: (scheduleData) => {
    console.log('📅 Creating regular schedule:', scheduleData);
    return api.post('/admin/regular-schedules', scheduleData);
  },

  // Get all regular schedules (Admin)
  getAllRegularSchedules: () => {
    console.log('📋 Fetching all regular schedules');
    return api.get('/admin/regular-schedules');
  }
};

// ==================== DOWNLOAD REPORT UTILITY ====================
export const downloadReportFile = async (reportId, reportName, format = 'pdf') => {
  try {
    console.log(`📥 Downloading report: ${reportName} as ${format}`);
    
    const response = await adminAPI.downloadReport(reportId, format);
    
    // Create blob from response
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${reportName.replace(/\s+/g, '_')}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log(`✅ Successfully downloaded report: ${reportName}`);
    return {
      success: true,
      message: 'Report downloaded successfully'
    };
  } catch (error) {
    console.error(`❌ Error downloading report:`, error);
    return {
      success: false,
      message: error.message || 'Failed to download report'
    };
  }
};

// Test API connection
export const testConnection = async () => {
  try {
    console.log('🔌 Testing API connection...');
    const response = await api.get('/health');
    console.log('✅ API Connection successful:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ API Connection failed:', error.message);
    throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:5000');
  }
};

// Test backend connectivity on app start
export const initializeApp = async () => {
  try {
    await testConnection();
    return true;
  } catch (error) {
    console.error('🚨 App initialization failed:', error.message);
    return false;
  }
};

export default api;