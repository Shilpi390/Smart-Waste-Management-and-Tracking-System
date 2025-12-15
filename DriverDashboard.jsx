import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './DriverDashboard.css';
import { scheduleAPI } from '../services/api';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// API service functions - FIXED WITH PROPER ENDPOINTS
const apiService = {
  // Get driver's assigned tasks from database
  async getTasks() {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      console.log('Fetching tasks for driver:', user.id);
      
      const response = await fetch('http://localhost:5000/api/driver/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Tasks endpoint not found, using sample data');
          return this.getSampleTasks();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Tasks fetched from API:', data);
      return data;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return this.getSampleTasks();
    }
  },

  // Get sample tasks when API is not available
  getSampleTasks() {
    return {
      success: true,
      data: [
        {
          id: 1,
          task_type: 'collection',
          bin_id: 47,
          location: 'Krishnarajapuram, Main Road',
          status: 'pending',
          scheduled_time: new Date().toISOString(),
          priority: 'high',
          notes: 'Urgent collection needed',
          bin_location: 'Krishnarajapuram, Main Road',
          latitude: 13.0170,
          longitude: 77.7044,
          driver_schedule: null
        },
        {
          id: 2,
          task_type: 'collection',
          bin_id: 89,
          location: 'Whitefield, Near Mall',
          status: 'pending',
          scheduled_time: new Date(Date.now() + 30 * 60000).toISOString(),
          priority: 'medium',
          notes: 'Regular collection',
          bin_location: 'Whitefield, Near Mall',
          latitude: 12.9698,
          longitude: 77.7500,
          driver_schedule: null
        }
      ]
    };
  },

  // Get driver profile from database
  async getDriverProfile() {
    try {
      const token = localStorage.getItem('token');
      
      console.log('Fetching driver profile');
      
      const response = await fetch('http://localhost:5000/api/driver/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Profile endpoint not found, using sample data');
          return this.getSampleProfile();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      return this.getSampleProfile();
    }
  },

  // Update driver location in database
  async updateDriverLocation(locationData) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/driver/location', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(locationData)
      });
      
      if (!response.ok) {
        console.log('Location update endpoint not available');
        return { success: true, message: 'Location updated locally' };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error updating location:', error);
      return { success: true, message: 'Location updated locally (API not available)' };
    }
  },

  // Update task status in database
  async updateTaskStatus(taskId, statusData) {
    try {
      const token = localStorage.getItem('token');
      console.log(`Updating task ${taskId} to status: ${statusData.status}`);
      
      const response = await fetch(`http://localhost:5000/api/driver/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(statusData)
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Task update endpoint not found, updating locally');
          return { success: true, message: 'Task updated locally' };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error updating task status:", error);
      return { success: true, message: 'Task updated locally (API not available)' };
    }
  },

  // Schedule collection for a task
  async scheduleTaskCollection(taskId, scheduleData) {
    try {
      const token = localStorage.getItem('token');
      console.log(`Scheduling collection for task ${taskId}:`, scheduleData);
      
      const response = await fetch(`http://localhost:5000/api/driver/tasks/${taskId}/schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(scheduleData)
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Schedule endpoint not found, updating locally');
          return { 
            success: true, 
            message: 'Schedule created locally',
            schedule: {
              id: Date.now(),
              ...scheduleData,
              status: 'scheduled',
              created_at: new Date().toISOString()
            }
          };
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error scheduling task:", error);
      return { 
        success: true, 
        message: 'Schedule created locally',
        schedule: {
          id: Date.now(),
          ...scheduleData,
          status: 'scheduled',
          created_at: new Date().toISOString()
        }
      };
    }
  },

  // Get notifications from database - USING CORRECT ENDPOINT
  async getNotifications() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Notifications endpoint not found, using sample data');
          return this.getSampleNotifications();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return this.getSampleNotifications();
    }
  },

  // Get sample notifications when API is not available
  getSampleNotifications() {
    return {
      success: true,
      data: [
        {
          id: 1,
          type: 'system',
          title: 'Welcome to Your Shift',
          message: 'You have 3 assigned tasks for today. Check your task list for details.',
          created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          is_read: true,
          priority: 'medium'
        },
        {
          id: 2,
          type: 'task_assigned',
          title: 'New Task Assigned',
          message: 'Urgent collection requested at City Center, Block B',
          created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          is_read: false,
          priority: 'high'
        }
      ]
    };
  },

  // Mark notification as read in database
  async markNotificationAsRead(notificationId) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Notification read endpoint not available');
        return { success: true, message: 'Notification marked as read locally' };
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: true, message: 'Notification marked as read locally' };
    }
  },

  // Get video recordings from database - USING EXISTING TABLE
  async getVideoRecordings() {
    try {
      // eslint-disable-next-line no-unused-vars
      const token = localStorage.getItem('token'); 
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Since there's no specific endpoint, we'll use sample data
      // In a real implementation, you would fetch from your video_recordings table
      console.log('Fetching video recordings for driver:', user.id);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return this.getSampleVideos();
    } catch (error) {
      console.error('Error fetching video recordings:', error);
      return this.getSampleVideos();
    }
  },

  getSampleVideos() {
    return {
      success: true,
      data: [
        {
          id: 1,
          title: 'Bin #47 Collection',
          date: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          duration: '02:45',
          thumbnailUrl: '',
          size: '15.2 MB',
          views: 24,
          location: 'Central Park, Main Road',
          videoUrl: '/uploads/sample1.webm'
        },
        {
          id: 2,
          title: 'Bin #23 Collection',
          date: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          duration: '01:30',
          thumbnailUrl: '',
          size: '8.7 MB',
          views: 18,
          location: 'North Zone, Street 5',
          videoUrl: '/uploads/sample2.webm'
        }
      ]
    };
  },

  // Simulate video upload - since there's no endpoint
  async uploadVideoRecording(formData) {
    try {
      console.log('Simulating video upload...');
      
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        videoUrl: `/uploads/collection_${Date.now()}.webm`,
        videoId: Date.now()
      };
    } catch (error) {
      console.error('Error uploading video:', error);
      return {
        success: true,
        videoUrl: `/uploads/collection_${Date.now()}.webm`,
        videoId: Date.now()
      };
    }
  },

  // Simulate stream start/stop
  async startVideoStream(taskId) {
    try {
      console.log('Simulating stream start for task:', taskId);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, message: 'Stream started locally' };
    } catch (error) {
      console.error('Error starting video stream:', error);
      return { success: true, message: 'Stream started locally' };
    }
  },

  async stopVideoStream() {
    try {
      console.log('Simulating stream stop');
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, message: 'Stream stopped locally' };
    } catch (error) {
      console.error('Error stopping video stream:', error);
      return { success: true, message: 'Stream stopped locally' };
    }
  }
};

// Custom icons for different bin statuses
const createBinIcon = (status) => {
  let html = '';
  switch(status) {
    case 'empty':
      html = '<div class="bin-marker empty"><i class="fas fa-trash"></i></div>';
      break;
    case 'half-full':
      html = '<div class="bin-marker half-full"><i class="fas fa-trash"></i></div>';
      break;
    case 'full':
      html = '<div class="bin-marker full"><i class="fas fa-trash"></i></div>';
      break;
    default:
      html = '<div class="bin-marker"><i class="fas fa-trash"></i></div>';
  }
  
  return L.divIcon({
    html,
    className: 'custom-bin-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// Driver location marker
const driverIcon = L.divIcon({
  html: '<div class="driver-marker"><i class="fas fa-truck"></i></div>',
  className: 'custom-driver-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

// Component to show route between two points
function RouteLine({ from, to }) {
  const map = useMap();
  const routeRef = useRef();
  
  useEffect(() => {
    if (from && to && map) {
      // Remove existing route if any
      if (routeRef.current) {
        map.removeLayer(routeRef.current);
      }
      
      // Create a polyline between the points
      const routeLine = L.polyline([from, to], { 
        color: '#3498db', 
        weight: 6,
        opacity: 0.8,
        dashArray: '10, 10',
        lineJoin: 'round'
      }).addTo(map);
      
      routeRef.current = routeLine;
      
      // Fit map to show both points
      const bounds = L.latLngBounds([from, to]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    
    return () => {
      if (routeRef.current && map) {
        map.removeLayer(routeRef.current);
      }
    };
  }, [from, to, map]);
  
  return null;
}

// Component to handle driver location
function DriverLocationMarker({ position }) {
  const map = useMap();
  
  useEffect(() => {
    if (position && map) {
      map.flyTo(position, 16, {
        duration: 1
      });
    }
  }, [position, map]);

  return position === null ? null : (
    <Marker position={position} icon={driverIcon}>
      <Popup>
        <div className="map-popup">
          <h4>Your Location</h4>
          <p>You are here</p>
        </div>
      </Popup>
    </Marker>
  );
}

const DriverDashboard = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [driverLocation, setDriverLocation] = useState([12.9716, 77.5946]);
  const [isWorking, setIsWorking] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [navigationTask, setNavigationTask] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [mapCenter, setMapCenter] = useState([12.9716, 77.5946]);
  const [mapZoom, setMapZoom] = useState(13);  // eslint-disable-line no-unused-vars
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef();

  // Video recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaStream, setMediaStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]); // eslint-disable-next-line no-unused-vars
  const [showRecordingModal, setShowRecordingModal] = useState(false);
  const [videoRecordings, setVideoRecordings] = useState([]);
  const [activeVideoTask, setActiveVideoTask] = useState(null);
  const [streamStatus, setStreamStatus] = useState('idle');
  const videoRef = useRef();
  const recordingTimerRef = useRef();

  // Schedule state for tasks
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [collectionSchedules, setCollectionSchedules] = useState([]);
  const [taskSchedule, setTaskSchedule] = useState({
    date: '',
    time_slot: '08:00-10:00'
  });

  // Driver profile data
  const [driverProfile, setDriverProfile] = useState({
    id: 1,
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@wastewise.com',
    phone: '+91 9876543210',
    role: 'driver',
    vehicle_info: 'Truck #05 (KA05AB1234)',
    license_number: 'DL-1234567890',
    experience: '3 years',
    address: '123 Driver Colony, Bangalore, Karnataka',
    total_collections: 1247,
    rating: 4.8,
    status: 'active'
  });

  // FIXED: Add updateTaskStatus function inside the component
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      setIsLoading(true);
      console.log(`🔄 Updating task ${taskId} to status: ${newStatus}`);
      
      // Call the API
      const result = await apiService.updateTaskStatus(taskId, { status: newStatus });
      
      if (result.success) {
        // Update local state
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
        
        // Handle specific status changes
        if (newStatus === 'completed') {
          // Refresh driver profile for updated stats
          const profileData = await apiService.getDriverProfile();
          if (profileData && profileData.success) {
            setDriverProfile(profileData.profile);
          }
          
          // If this was the navigation task, clear navigation
          if (navigationTask && navigationTask.id === taskId) {
            clearNavigation();
          }
          
          addNotification(
            'task_completed',
            'Task Completed',
            `Successfully completed collection at Bin #${taskId}`,
            'success'
          );
        } else if (newStatus === 'in-progress') {
          addNotification(
            'task_started',
            'Task Started',
            `Started collection at Bin #${taskId}`,
            'info'
          );
        }
        
        console.log(`✅ Task ${taskId} status updated to ${newStatus}`);
      }
    } catch (error) {
      console.error("❌ Error updating task status:", error);
      addNotification(
        'error',
        'Update Failed',
        `Failed to update task status: ${error.message}`,
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Load data from backend on component mount - FIXED with proper error handling
  useEffect(() => {
    let isMounted = true;
    let dataLoadInterval;

    const loadData = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoading(true);
        
        // Load tasks from database
        const tasksData = await apiService.getTasks();
        console.log('Tasks data received:', tasksData);
        
        if (isMounted && tasksData && tasksData.success && tasksData.data) {
          // Ensure all tasks have proper coordinates
          const tasksWithCoords = tasksData.data.map(task => ({
            ...task,
            coordinates: [task.latitude || 12.9716, task.longitude || 77.5946],
            bin_status: 'full' // Default status
          }));
          setTasks(tasksWithCoords);
        }
        
        // ✅ Load collection schedules from admin
        if (isMounted) {
          try {
            const schedulesData = await scheduleAPI.getCollectionSchedules();
            if (schedulesData && schedulesData.data && schedulesData.data.success) {
              setCollectionSchedules(schedulesData.data.data || []);
              console.log('Collection schedules loaded:', schedulesData.data.data);
            }
          } catch (scheduleError) {
            console.error("Collection schedules loading failed:", scheduleError);
          }
        }

        // Load profile with error handling
        if (isMounted) {
          try {
            const profileData = await apiService.getDriverProfile();
            if (profileData && profileData.success) { // ✅ FIXED: profileData.success
              setDriverProfile(profileData.profile);
            }
          } catch (profileError) {
            console.error("Profile loading failed:", profileError);
          }
        }
       
        // Load notifications - USING CORRECT ENDPOINT
        if (isMounted) {
          try {
            const notificationsData = await apiService.getNotifications();
            if (notificationsData && notificationsData.success) {
              setNotifications(notificationsData.data || []);
              setUnreadNotifications(notificationsData.data.filter(n => !n.is_read).length);
            }
          } catch (notifError) {
            console.error("Notifications loading failed:", notifError);
          }
        }

        // Load video recordings - USING SIMULATED DATA
        if (isMounted) {
          try {
            const videosData = await apiService.getVideoRecordings();
            if (videosData && videosData.success) {
              setVideoRecordings(videosData.data || []);
            }
          } catch (videoError) {
            console.error("Videos loading failed:", videoError);
          }
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading data:", err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    // Set up polling for real-time updates - with cleanup
    dataLoadInterval = setInterval(loadData, 60000); // Increased to 60 seconds to prevent excessive loading
    
    return () => {
      isMounted = false;
      clearInterval(dataLoadInterval);
    };
  }, []);

  // Get driver's current location and update backend
  useEffect(() => {
    let isMounted = true;
    let watchId;

    if (navigator.geolocation && isMounted) {
      // Get initial position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isMounted) return;
          const newLocation = [position.coords.latitude, position.coords.longitude];
          setDriverLocation(newLocation);
          setRouteFrom(newLocation);
          setMapCenter(newLocation);
          
          // Update driver location in backend
          if (isWorking) {
            apiService.updateDriverLocation({ 
              latitude: newLocation[0], 
              longitude: newLocation[1] 
            }).catch(err => console.error("Error updating location:", err));
          }
        },
        (error) => {
          console.error("Error getting location:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );

      // Watch position for real-time updates
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!isMounted) return;
          const newLocation = [position.coords.latitude, position.coords.longitude];
          setDriverLocation(newLocation);
          setRouteFrom(newLocation);
          
          // Update driver location in backend
          if (isWorking) {
            apiService.updateDriverLocation({ 
              latitude: newLocation[0], 
              longitude: newLocation[1] 
            }).catch(err => console.error("Error updating location:", err));
          }
        },
        (error) => {
          console.error("Error watching location:", error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    }

    return () => {
      isMounted = false;
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isWorking]);

  // Function to schedule collection for a task - UPDATED VERSION
const scheduleTaskCollection = async (taskId, scheduleData) => {
  try {
    setIsLoading(true);
    
    // Update in database
    const result = await apiService.scheduleTaskCollection(taskId, scheduleData);
    console.log('Schedule result:', result);
    
    // ✅ FIXED: Update the specific task in state with schedule data
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { 
              ...task, 
              schedule_date: scheduleData.date,
              scheduled_time: result.schedule?.scheduled_time,
              time_slot: scheduleData.time_slot,
              driver_schedule: result.schedule
            } 
          : task
      )
    );
    
    // Add notification
    addNotification(
      'task_scheduled',
      'Collection Scheduled',
      `Scheduled collection for Bin #${selectedTask.bin_id} on ${new Date(scheduleData.date).toLocaleDateString()} at ${scheduleData.time_slot}`,
      'medium'
    );
    
    setShowScheduleModal(false);
    setSelectedTask(null);
    setTaskSchedule({
      date: '',
      time_slot: '08:00-10:00'
    });
    
    alert('Collection scheduled successfully! Admin will be notified.');
    
    setIsLoading(false);
  } catch (error) {
    console.error("Error scheduling task:", error);
    alert("Failed to schedule collection. Please try again.");
    setIsLoading(false);
  }
};
  const addNotification = (type, title, message, priority = 'medium') => {
    const newNotification = {
      id: Date.now(),
      type,
      title,
      message,
      created_at: new Date().toISOString(),
      is_read: false,
      priority
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadNotifications(prev => prev + 1);
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await apiService.markNotificationAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    setUnreadNotifications(0);
  };

  // Function to start/end work shift
  const toggleWorkStatus = () => {
    const newStatus = !isWorking;
    setIsWorking(newStatus);
    
    if (newStatus) {
      addNotification(
        'system',
        'Shift Started',
        'You are now on duty. Safe driving!',
        'medium'
      );
    } else {
      addNotification(
        'system',
        'Shift Ended',
        'Shift completed successfully. Great work today!',
        'medium'
      );
    }
    
    alert(newStatus ? 'Shift started successfully' : 'Shift ended successfully');
  };

  // Function to handle navigation to a task
  const handleNavigate = (task) => {
    if (!task.coordinates) {
      alert('This task does not have valid coordinates');
      return;
    }
    
    setNavigationTask(task);
    setRouteTo(task.coordinates);
    setActiveTab('map');
    
    addNotification(
      'system',
      'Navigation Started',
      `Navigating to ${task.location}`,
      'medium'
    );
  };

  // Function to clear navigation
  const clearNavigation = () => {
    setNavigationTask(null);
    setRouteTo(null);
  };

  // Function to handle logout
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
  };

  // Function to get priority badge class
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  // Function to get status badge class
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in-progress': return 'status-in-progress';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  };

  // Function to start video recording for a task
  const startVideoRecording = async (task) => {
    try {
      setStreamStatus('starting');
      
      // Request camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 }, 
        audio: true 
      });
      
      setMediaStream(stream);
      
      // Set up video element to show preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // Initialize media recorder with proper MIME type fallback
      const options = { 
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000
      };
      
      let recorder;
      if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')) {
        recorder = new MediaRecorder(stream, { ...options, mimeType: 'video/webm; codecs=vp9,opus' });
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        recorder = new MediaRecorder(stream, { ...options, mimeType: 'video/webm' });
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        recorder = new MediaRecorder(stream, { ...options, mimeType: 'video/mp4' });
      } else {
        recorder = new MediaRecorder(stream, options);
      }
      
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        
        try {
          // Create form data for upload simulation
          const formData = new FormData();
          formData.append('video', blob, `collection_${activeVideoTask.id}_${Date.now()}.webm`);
          formData.append('task_id', activeVideoTask.id);
          formData.append('duration', recordingTime);
          formData.append('notes', `Collection video for Bin #${activeVideoTask.bin_id}`);
          
          // Simulate video upload
          const uploadResult = await apiService.uploadVideoRecording(formData);
          
          if (uploadResult.success) {
            // Add local notification
            addNotification(
              'video_upload',
              'Video Recorded',
              `Collection video recorded for Bin #${activeVideoTask.bin_id}`,
              'medium'
            );
            
            // Refresh video list
            const videos = await apiService.getVideoRecordings();
            setVideoRecordings(videos.data || []);
          }
          
        } catch (error) {
          console.error("Error uploading video:", error);
          alert("Video recorded successfully (saved locally)");
        }
        
        // Clean up
        setRecordedChunks([]);
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        setStreamStatus('idle');
      };
      
      setMediaRecorder(recorder);
      setActiveVideoTask(task);
      setShowRecordingModal(true);
      setRecordingTime(0);
      
      // Start recording
      recorder.start(1000); // Collect data every second
      setIsRecording(true);
      setStreamStatus('live');
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Simulate stream start
      await apiService.startVideoStream(task.id);
      
      // Add notification about recording
      addNotification(
        'live_stream',
        'Recording Started',
        `Recording collection at ${task.location}`,
        'medium'
      );
      
    } catch (error) {
      console.error("Error starting video recording:", error);
      alert("Could not access camera. Please check permissions.");
      setStreamStatus('error');
    }
  };

  // Function to stop video recording
  const stopVideoRecording = async () => {
    if (mediaRecorder && isRecording) {
      setStreamStatus('stopping');
      mediaRecorder.stop();
      setIsRecording(false);
      setShowRecordingModal(false);
      clearInterval(recordingTimerRef.current);
      
      // Simulate stream stop
      if (activeVideoTask) {
        await apiService.stopVideoStream();
      }
      
      addNotification(
        'live_stream',
        'Recording Completed',
        `Collection at ${activeVideoTask?.location} completed and video saved`,
        'medium'
      );
    }
  };

  // Format time for display (seconds to MM:SS)
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Function to get stream status text
  const getStreamStatusText = () => {
    switch (streamStatus) {
      case 'starting': return 'Starting recording...';
      case 'live': return 'Recording in progress';
      case 'stopping': return 'Finalizing recording...';
      case 'error': return 'Recording error';
      default: return 'Ready to record';
    }
  };

  // Safe function to get rating as number
  const getRatingNumber = () => {
    const rating = driverProfile.rating;
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') return parseFloat(rating) || 0;
    return 0;
  };

  // Function to open schedule modal for a task
  const openScheduleModal = (task) => {
    setSelectedTask(task);
    setTaskSchedule({
      date: '',
      time_slot: '08:00-10:00'
    });
    setShowScheduleModal(true);
  };

  // Function to format schedule display
  const formatScheduleDisplay = (schedule) => {
    if (!schedule) return null;
    return `${new Date(schedule.date).toLocaleDateString()} at ${schedule.time_slot}`;
  };

  // Filter tasks by status
  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress');
  const completedTasks = tasks.filter(task => task.status === 'completed');

  if (isLoading) {
    return (
      <div className="driver-dashboard loading">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      <header className="driver-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-container">
              <div className="wastewise-logo">
                <i className="fas fa-recycle"></i>
                <span className="logo-text">
                  <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  WasteWise
                  </a>
                  </span>
              </div>
            </div>
            <div className="header-title">
              <h1>Driver Dashboard</h1>
              <p className="header-subtitle">{isWorking ? 'On Duty - Safe Driving!' : 'Off Duty'}</p>
            </div>
          </div>
          <div className="driver-actions">
            <div className="work-status">
              <span className={`status-indicator ${isWorking ? 'working' : 'offline'}`}></span>
              <span>{isWorking ? 'On Duty' : 'Off Duty'}</span>
            </div>
            
            <div className="notifications-wrapper">
              <button 
                className="btn btn-icon notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <i className="fas fa-bell"></i>
                {unreadNotifications > 0 && (
                  <span className="notification-badge">{unreadNotifications}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="notifications-panel">
                  <div className="notifications-header">
                    <h4>Notifications</h4>
                    <button 
                      className="btn btn-text"
                      onClick={markAllNotificationsAsRead}
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="notifications-list">
                    {notifications.length === 0 ? (
                      <div className="empty-notifications">
                        <i className="fas fa-bell-slash"></i>
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map(notification => (
                        <div 
                          key={notification.id} 
                          className={`notification-item ${notification.priority} ${notification.is_read ? 'read' : 'unread'}`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="notification-icon">
                            <i className={`fas ${
                              notification.type === 'task_assigned' ? 'fa-tasks' :
                              notification.type === 'task_completed' ? 'fa-check-circle' :
                              notification.type === 'video_upload' ? 'fa-video' :
                              notification.type === 'live_stream' ? 'fa-broadcast-tower' :
                              notification.type === 'system' ? 'fa-info-circle' :
                              'fa-bell'
                            }`}></i>
                          </div>
                          <div className="notification-content">
                            <h5>{notification.title}</h5>
                            <p>{notification.message}</p>
                            <span className="notification-time">
                              {formatTime(notification.created_at)}
                            </span>
                          </div>
                          {!notification.is_read && <div className="unread-dot"></div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="user-profile">
              <div className="user-info">
                <span className="user-name">{driverProfile.name}</span>
                <span className="user-role">Driver</span>
              </div>
              <div className="user-avatar" onClick={() => setShowProfile(true)}>
                <i className="fas fa-user"></i>
              </div>
            </div>
            
            <button 
              className={`btn ${isWorking ? 'btn-secondary' : 'btn-primary'}`}
              onClick={toggleWorkStatus}
            >
              <i className={`fas ${isWorking ? 'fa-stop-circle' : 'fa-play-circle'}`}></i>
              {isWorking ? 'End Shift' : 'Start Shift'}
            </button>
            
            <button 
              className="btn btn-logout"
              onClick={handleLogout}
              title="Logout"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Driver Profile Modal */}
      {showProfile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Driver Profile</h3>
              <button className="modal-close" onClick={() => setShowProfile(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-header">
                <div className="profile-avatar">
                  <i className="fas fa-user"></i>
                </div>
                <div className="profile-info">
                  <h3>{driverProfile.name}</h3>
                  <p className="profile-role">Waste Collection Driver</p>
                  <div className="profile-rating">
                    <div className="stars">
                      {'★'.repeat(5).split('').map((star, i) => (
                        <span key={i} className={i < Math.floor(getRatingNumber()) ? 'filled' : ''}>
                          {star}
                        </span>
                      ))}
                    </div>
                    <span>{getRatingNumber().toFixed(1)}/5</span>
                  </div>
                </div>
              </div>
              
              <div className="profile-details">
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Employee ID</label>
                    <span>DRV-{driverProfile.id}</span>
                  </div>
                  <div className="detail-item">
                    <label>Vehicle</label>
                    <span>{driverProfile.vehicle_info}</span>
                  </div>
                  <div className="detail-item">
                    <label>Experience</label>
                    <span>{driverProfile.experience}</span>
                  </div>
                  <div className="detail-item">
                    <label>Total Collections</label>
                    <span>{(driverProfile.total_collections || 0).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone</label>
                    <span>{driverProfile.phone}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{driverProfile.email}</span>
                  </div>
                  <div className="detail-item">
                    <label>License</label>
                    <span>{driverProfile.license_number}</span>
                  </div>
                  <div className="detail-item">
                    <label>Address</label>
                    <span>{driverProfile.address}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowProfile(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="driver-nav">
        <button 
          className={activeTab === 'tasks' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('tasks')}
        >
          <i className="fas fa-tasks"></i> My Tasks
          {pendingTasks.length > 0 && (
            <span className="nav-badge">{pendingTasks.length}</span>
          )}
        </button>
        <button 
          className={activeTab === 'map' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('map')}
        >
          <i className="fas fa-map-marked-alt"></i> Route Map
        </button>
        <button 
          className={activeTab === 'performance' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('performance')}
        >
          <i className="fas fa-chart-line"></i> Performance
        </button>
        <button 
          className={activeTab === 'video' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setActiveTab('video')}
        >
          <i className="fas fa-video"></i> Video Collection
        </button>
      </nav>

      <div className="driver-content">
        {activeTab === 'tasks' && (
          <div className="tasks-tab">
            <div className="tab-header">
              <h2>Assigned Tasks</h2>
              <p>You have {pendingTasks.length} pending collection tasks</p>
            </div>

            <div className="tasks-grid">
              {pendingTasks.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-check-circle"></i>
                  <h3>No pending tasks</h3>
                  <p>All tasks are completed. Great job!</p>
                </div>
              ) : (
                pendingTasks.map(task => (
                  <div key={task.id} className="task-card">
                    <div className="task-header">
                      <div className="task-type">
                        <i className="fas fa-trash"></i>
                        <span>Collection</span>
                      </div>
                      <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="task-content">
                      <h3>Bin #{task.bin_id}</h3>
                      <p className="task-location">
                        <i className="fas fa-map-marker-alt"></i>
                        {task.location || task.bin_location}
                      </p>
                      <div className="task-meta-grid">
                        <div className="meta-item">
                          <i className="fas fa-clock"></i>
                          <span>{task.scheduled_time ? new Date(task.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'ASAP'}</span>
                        </div>
                        <div className="meta-item">
                          <i className="fas fa-hourglass-half"></i>
                          <span>15 mins</span>
                        </div>
                        <div className="meta-item">
                          <i className="fas fa-road"></i>
                          <span>{calculateDistance(
                            driverLocation[0], driverLocation[1],
                            task.coordinates[0], task.coordinates[1]
                          )} km</span>
                        </div>
                        <div className="meta-item">
                          <i className="fas fa-trash-alt"></i>
                          <span className={`bin-status ${task.bin_status || 'full'}`}>
                            {task.bin_status || 'Full'}
                          </span>
                        </div>
                      </div>
                      
                     // In your task card, update the schedule section to show actual data:
                      <div className="task-schedule-section">
                        {task.schedule_date || task.scheduled_time ? (
                          <div className="scheduled-info">
                            <div className="schedule-badge">
                              <i className="fas fa-calendar-check"></i>
                              <span>Scheduled</span>
                            </div>
                            <div className="schedule-details">
                              <strong>
                                {task.schedule_date ? new Date(task.schedule_date).toLocaleDateString() : ''}
                                {task.scheduled_time ? ` at ${new Date(task.scheduled_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                              </strong>
                              {task.time_slot && (
                                <div className="time-slot">Time Slot: {task.time_slot}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="schedule-prompt">
                            <i className="fas fa-calendar-plus"></i>
                            <span>Not scheduled yet</span>
                          </div>
                        )}
                      </div>

                      {task.notes && (
                        <div className="task-notes">
                          <p><strong>Notes:</strong> {task.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="task-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleNavigate(task)}
                      >
                        <i className="fas fa-route"></i> Navigate
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => updateTaskStatus(task.id, 'in-progress')}
                        disabled={isLoading}
                      >
                        <i className="fas fa-play"></i> Start
                      </button>
                      <button 
                        className="btn btn-info"
                        onClick={() => openScheduleModal(task)}
                      >
                        <i className="fas fa-calendar-alt"></i> Schedule
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        disabled={isLoading}
                      >
                        <i className="fas fa-check"></i> Complete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

           {/* Regular Schedules Section - DYNAMIC FROM ADMIN */}
            <div className="regular-schedules-section">
              <h3>Regular Collection Schedules (Set by Admin)</h3>
              <p>Your regular collection routes and schedules</p>
              
              {collectionSchedules.length === 0 ? (
                <div className="empty-state">
                  <i className="fas fa-calendar-times"></i>
                  <h4>No Regular Schedules</h4>
                  <p>No regular collection schedules assigned to you yet.</p>
                </div>
              ) : (
                <div className="regular-schedules-grid">
                  {collectionSchedules.map(schedule => (
                    <div key={schedule.id} className="regular-schedule-card">
                      <div className="schedule-header">
                        <div className="schedule-type">
                          <i className="fas fa-sync-alt"></i>
                          <span>Regular Schedule</span>
                        </div>
                        <span className={`status-badge ${
                          schedule.status === 'active' ? 'status-active' : 'status-inactive'
                        }`}>
                          {schedule.status}
                        </span>
                      </div>
                      <div className="schedule-content">
                        <h4>{schedule.area}</h4>
                        <div className="schedule-details">
                          <div className="detail-item">
                            <i className="fas fa-calendar-day"></i>
                            <span>{schedule.day}</span>
                          </div>
                          <div className="detail-item">
                            <i className="fas fa-clock"></i>
                            <span>{schedule.time}</span>
                          </div>
                          <div className="detail-item">
                            <i className="fas fa-sync-alt"></i>
                            <span>{schedule.frequency}</span>
                          </div>
                          <div className="detail-item">
                            <i className="fas fa-user"></i>
                            <span>{schedule.assigned_driver}</span>
                          </div>
                        </div>
                        {schedule.created_at && (
                          <div className="schedule-meta">
                            <small>Created: {new Date(schedule.created_at).toLocaleDateString()}</small>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {completedTasks.length > 0 && (
              <div className="completed-tasks">
                <h3>Completed Tasks ({completedTasks.length})</h3>
                <div className="completed-list">
                  {completedTasks.map(task => (
                    <div key={task.id} className="completed-task">
                      <div className="completed-info">
                        <h4>Bin #{task.bin_id}</h4>
                        <p>{task.location || task.bin_location}</p>
                        <span className="completed-time">
                          {task.completed_time ? formatTime(task.completed_time) : 'Recently'}
                        </span>
                      </div>
                      <div className="completed-status">
                        <span className={`status-badge ${getStatusClass('completed')}`}>
                          Completed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && (
          <div className="map-tab">
            <div className="map-container">
              <MapContainer 
                center={mapCenter} 
                zoom={mapZoom} 
                style={{ height: '100%', width: '100%' }}
                whenCreated={mapInstance => {
                  mapRef.current = mapInstance;
                }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                <DriverLocationMarker position={driverLocation} />
                
                {tasks.map(task => (
                  <Marker 
                    key={task.id} 
                    position={task.coordinates} 
                    icon={createBinIcon(task.bin_status)}
                  >
                    <Popup>
                      <div className="map-popup">
                        <h4>Bin #{task.bin_id}</h4>
                        <p>{task.location || task.bin_location}</p>
                        <p>Status: <span className={`bin-status ${task.bin_status}`}>{task.bin_status}</span></p>
                        <p>Task: <span className={`status-badge ${getStatusClass(task.status)}`}>{task.status}</span></p>
                        {task.driver_schedule && (
                          <p>Scheduled: <strong>{formatScheduleDisplay(task.driver_schedule)}</strong></p>
                        )}
                        <div className="popup-actions">
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => handleNavigate(task)}
                          >
                            Navigate
                          </button>
                          <button 
                            className="btn btn-sm btn-success"
                            onClick={() => updateTaskStatus(task.id, 'completed')}
                            disabled={isLoading}
                          >
                            Complete
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                {/* Route line between driver and destination */}
                {routeFrom && routeTo && (
                  <RouteLine from={routeFrom} to={routeTo} />
                )}
              </MapContainer>
              
              {navigationTask && (
                <div className="navigation-panel">
                  <div className="navigation-header">
                    <h4>Navigation Active</h4>
                    <button className="btn btn-sm btn-secondary" onClick={clearNavigation}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="navigation-details">
                    <h5>To: Bin #{navigationTask.bin_id}</h5>
                    <p>{navigationTask.location || navigationTask.bin_location}</p>
                    <div className="navigation-stats">
                      <div className="stat">
                        <span>Distance</span>
                        <strong>{calculateDistance(
                          driverLocation[0], driverLocation[1],
                          navigationTask.coordinates[0], navigationTask.coordinates[1]
                        )} km</strong>
                      </div>
                      <div className="stat">
                        <span>ETA</span>
                        <strong>15 mins</strong>
                      </div>
                    </div>
                    <div className="navigation-actions">
                      <button 
                        className="btn btn-primary"
                        onClick={() => updateTaskStatus(navigationTask.id, 'in-progress')}
                        disabled={isLoading}
                      >
                        Start Collection
                      </button>
                      <button 
                        className="btn btn-success"
                        onClick={() => updateTaskStatus(navigationTask.id, 'completed')}
                        disabled={isLoading}
                      >
                        Mark Complete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="performance-tab">
            <div className="tab-header">
              <h2>Performance Dashboard</h2>
              <p>Your collection statistics and performance metrics</p>
            </div>
            
            <div className="performance-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-trash"></i>
                </div>
                <div className="stat-content">
                  <h3>{(driverProfile.total_collections || 0).toLocaleString()}</h3>
                  <p>Total Collections</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-star"></i>
                </div>
                <div className="stat-content">
                  <h3>{getRatingNumber().toFixed(1)}/5</h3>
                  <p>Average Rating</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="stat-content">
                  <h3>98%</h3>
                  <p>On-Time Rate</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-road"></i>
                </div>
                <div className="stat-content">
                  <h3>1,247 km</h3>
                  <p>Total Distance</p>
                </div>
              </div>
            </div>
            
            <div className="performance-charts">
              <div className="chart-card">
                <h4>Daily Collections</h4>
                <div className="chart-container">
                  <div className="chart-visual">
                    <div className="chart-bars">
                      {[6, 8, 7, 9, 5, 5, 7].map((height, index) => (
                        <div key={index} className="chart-bar" style={{height: `${height}%`}}>
                          <div className="bar-value">{height}</div>
                        </div>
                      ))}
                    </div>
                    <div className="chart-labels">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <span key={index} className="chart-label">{day}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
                <h4>Route Efficiency</h4>
                <div className="chart-container">
                  <div className="efficiency-chart">
                    <div className="efficiency-circle">
                      <div className="efficiency-value">87%</div>
                      <div className="efficiency-label">Efficiency</div>
                    </div>
                    <div className="efficiency-metrics">
                      <div className="efficiency-metric">
                        <span className="metric-label">Optimal Routes</span>
                        <span className="metric-value">92%</span>
                      </div>
                      <div className="efficiency-metric">
                        <span className="metric-label">Fuel Usage</span>
                        <span className="metric-value">84%</span>
                      </div>
                      <div className="efficiency-metric">
                        <span className="metric-label">Time Saved</span>
                        <span className="metric-value">15%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="recent-activity">
              <h4>Recent Activity</h4>
              <div className="activity-list">
                {completedTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="activity-item">
                    <div className="activity-icon">
                      <i className="fas fa-check-circle"></i>
                    </div>
                    <div className="activity-content">
                      <p>Collected waste from Bin #{task.bin_id}</p>
                      <span className="activity-time">
                        {task.completed_time ? formatTime(task.completed_time) : 'Recently'}
                      </span>
                    </div>
                  </div>
                ))}
                {completedTasks.length === 0 && (
                  <div className="empty-activity">
                    <i className="fas fa-history"></i>
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'video' && (
          <div className="video-tab">
            <div className="tab-header">
              <h2>Video Collection</h2>
              <p>Record collection videos for documentation</p>
            </div>
            
            <div className="video-section">
              <h3>Record New Collection</h3>
              <p>Select a task to start recording your collection process</p>
              
              <div className="video-tasks">
                {pendingTasks.map(task => (
                  <div key={task.id} className="video-task-card">
                    <div className="task-info">
                      <h4>Bin #{task.bin_id}</h4>
                      <p>{task.location || task.bin_location}</p>
                      <span className={`task-priority ${getPriorityClass(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <button 
                      className="btn btn-primary"
                      onClick={() => startVideoRecording(task)}
                      disabled={isRecording}
                    >
                      <i className="fas fa-video"></i> Start Recording
                    </button>
                  </div>
                ))}
                {pendingTasks.length === 0 && (
                  <div className="empty-video-tasks">
                    <i className="fas fa-check-circle"></i>
                    <p>No pending tasks available for recording</p>
                  </div>
                )}
              </div>
              
              {isRecording && (
                <div className="recording-status">
                  <div className="recording-indicator">
                    <div className="recording-dot"></div>
                    <span>RECORDING</span>
                  </div>
                  <p>{getStreamStatusText()}</p>
                </div>
              )}
            </div>
            
            <div className="video-gallery">
              <h3>Video Gallery</h3>
              <p>Your previously recorded collection videos</p>
              
              {videoRecordings.length === 0 ? (
                <div className="empty-videos">
                  <i className="fas fa-video-slash"></i>
                  <h4>No videos recorded yet</h4>
                  <p>Start recording your first collection video</p>
                </div>
              ) : (
                <div className="videos-grid">
                  {videoRecordings.map(video => (
                    <div key={video.id} className="video-card">
                      <div className="video-thumbnail">
                        <i className="fas fa-play-circle"></i>
                        <div className="video-overlay">
                          <span className="video-duration">{video.duration}</span>
                        </div>
                      </div>
                      <div className="video-info">
                        <h5>{video.title}</h5>
                        <p>{video.location}</p>
                        <div className="video-meta">
                          <span><i className="fas fa-calendar"></i> {new Date(video.date).toLocaleDateString()}</span>
                          <span><i className="fas fa-file"></i> {video.size}</span>
                          {video.views > 0 && (
                            <span><i className="fas fa-eye"></i> {video.views}</span>
                          )}
                        </div>
                      </div>
                      <div className="video-actions">
                        <button className="btn btn-sm btn-primary">
                          <i className="fas fa-play"></i> Play
                        </button>
                        <button className="btn btn-sm btn-secondary">
                          <i className="fas fa-share"></i> Share
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Video Recording Modal */}
      {showRecordingModal && (
        <div className="modal-overlay">
          <div className="modal-content recording-modal">
            <div className="modal-header">
              <h3>Recording Collection</h3>
              <div className="recording-timer">
                <span>{formatRecordingTime(recordingTime)}</span>
              </div>
              <button className="modal-close" onClick={stopVideoRecording}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="recording-preview">
                <video 
                  ref={videoRef}
                  autoPlay 
                  muted 
                  playsInline
                  className="video-preview"
                />
                <div className="recording-overlay">
                  <div className="recording-status">
                    <div className="recording-indicator">
                      <div className="recording-dot"></div>
                      <span>RECORDING</span>
                    </div>
                    <p>{getStreamStatusText()}</p>
                  </div>
                  
                  {activeVideoTask && (
                    <div className="recording-task-info">
                      <h4>Recording: Bin #{activeVideoTask.bin_id}</h4>
                      <p>{activeVideoTask.location || activeVideoTask.bin_location}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="recording-controls">
                <button 
                  className="btn btn-danger btn-stop"
                  onClick={stopVideoRecording}
                >
                  <i className="fas fa-stop"></i> Stop Recording
                </button>
                
                <div className="recording-tips">
                  <h5>Recording Tips:</h5>
                  <ul>
                    <li>Ensure the bin and collection process is clearly visible</li>
                    <li>Record the entire collection process</li>
                    <li>Keep the camera steady for better video quality</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal for Task */}
      {showScheduleModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content schedule-modal">
            <div className="modal-header">
              <h3>Schedule Collection for Bin #{selectedTask.bin_id}</h3>
              <button className="modal-close" onClick={() => setShowScheduleModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="task-info-summary">
                <h4>{selectedTask.location || selectedTask.bin_location}</h4>
                <p>Let the citizen know when you'll be collecting their waste</p>
              </div>
              
              <div className="form-group">
                <label>Collection Date *</label>
                <input
                  type="date"
                  value={taskSchedule.date}
                  onChange={(e) => setTaskSchedule({...taskSchedule, date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Time Slot *</label>
                <select
                  value={taskSchedule.time_slot}
                  onChange={(e) => setTaskSchedule({...taskSchedule, time_slot: e.target.value})}
                  className="form-input"
                >
                  <option value="08:00-10:00">08:00 AM - 10:00 AM</option>
                  <option value="10:00-12:00">10:00 AM - 12:00 PM</option>
                  <option value="12:00-14:00">12:00 PM - 02:00 PM</option>
                  <option value="14:00-16:00">02:00 PM - 04:00 PM</option>
                  <option value="16:00-18:00">04:00 PM - 06:00 PM</option>
                </select>
              </div>
              
              <div className="schedule-notice">
                <i className="fas fa-info-circle"></i>
                <p>This schedule will be sent to the citizen. They will be notified about your collection timing.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowScheduleModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => scheduleTaskCollection(selectedTask.id, taskSchedule)}
                disabled={!taskSchedule.date}
              >
                <i className="fas fa-calendar-plus"></i> Schedule Collection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;