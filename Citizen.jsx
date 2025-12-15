import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { citizenAPI, complaintsAPI, binsAPI, driversAPI, notificationsAPI, authAPI, liveStreamAPI } from "../services/api";
import "./Citizen.css";

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (status) => {
  let color = '#6c757d';
  switch(status) {
    case 'empty': color = '#28a745'; break;
    case 'half-full': color = '#ffc107'; break;
    case 'full': color = '#dc3545'; break;
    default: color = '#6c757d';
  }
  
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
             <i class="fas fa-trash" style="transform: rotate(45deg); color: white; font-size: 12px;"></i>
           </div>`,
    className: 'custom-bin-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
};

const userIcon = L.divIcon({
  html: `<div style="background-color: #3498db; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
           <i class="fas fa-user" style="transform: rotate(45deg); color: white; font-size: 12px;"></i>
         </div>`,
  className: 'custom-user-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

const driverIcon = L.divIcon({
  html: `<div style="background-color: #6f42c1; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
           <i class="fas fa-truck" style="transform: rotate(45deg); color: white; font-size: 12px;"></i>
         </div>`,
  className: 'custom-driver-marker',
  iconSize: [30, 30],
  iconAnchor: [15, 30]
});

function LocationMarker() {
  const [position, setPosition] = useState(null);
  const map = useMap();

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    });
  }, [map]);

  return position === null ? null : (
    <Marker position={position} icon={userIcon}>
      <Popup>Your Location</Popup>
    </Marker>
  );
}

// Component to update driver locations in real-time
function DriverLocations({ drivers, onDriverClick }) {
  return (
    <>
      {drivers.map(driver => (
        <Marker
          key={`driver-${driver.uniqueId}`}
          position={[driver.latitude, driver.longitude]}
          icon={driverIcon}
          eventHandlers={{
            click: () => onDriverClick(driver)
          }}
        >
          <Popup>
            <div className="driver-popup">
              <h3><i className="fas fa-truck"></i> {driver.name}</h3>
              <p><strong>Vehicle:</strong> {driver.vehicle}</p>
              <p><strong>Status:</strong> <span className={`driver-status-${driver.status}`}>{driver.status}</span></p>
              <p><strong>Phone:</strong> {driver.phone}</p>
              <p><strong>Speed:</strong> {driver.speed || '25 km/h'}</p>
              <p><strong>Last Update:</strong> {driver.lastUpdate || 'Just now'}</p>
              <button 
                className="btn-primary btn-sm"
                onClick={() => onDriverClick(driver)}
              >
                <i className="fas fa-video"></i> Watch Live
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function RouteLine({ from, to, color = "#3498db" }) {
  return from && to ? (
    <Polyline
      positions={[from, to]}
      color={color}
      weight={5}
      dashArray="10, 10"
      opacity={0.7}
    />
  ) : null;
}

// Memoized StreamCard component similar to Admin Dashboard
const StreamCard = React.memo(({ stream, onWatchLive, onTrackRoute }) => {
  const getStatusClass = useCallback((status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in-progress': return 'status-in-progress';
      case 'resolved': return 'status-resolved';
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      default: return 'status-pending';
    }
  }, []);

  const formatDuration = useCallback((startTime) => {
    if (!startTime) return '0m';
    const diff = new Date() - new Date(startTime);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }, []);

  const handleWatchLive = useCallback(() => {
    onWatchLive(stream);
  }, [stream, onWatchLive]);

  const handleTrackRoute = useCallback(() => {
    onTrackRoute(stream);
  }, [stream, onTrackRoute]);

  return (
    <div className="live-stream-card">
      <div className="stream-header">
        <h4>
          <i className="fas fa-truck"></i> {stream.driver_name}
        </h4>
        <span className={`status-badge ${getStatusClass(stream.status)}`}>
          {stream.status.replace('-', ' ').toUpperCase()}
        </span>
      </div>
      <div className="stream-content">
        <div className="stream-preview">
          <div className="video-placeholder">
            {stream.has_live_video ? (
              <>
                <i className="fas fa-video live-indicator"></i>
                <p>Live Feed Available</p>
                <span className="live-badge">LIVE</span>
              </>
            ) : (
              <>
                <i className="fas fa-truck-moving"></i>
                <p>Active Collection</p>
              </>
            )}
          </div>
        </div>
        <div className="stream-info">
          <div className="info-item">
            <label>Vehicle:</label>
            <span>{stream.vehicle_info}</span>
          </div>
          <div className="info-item">
            <label>Location:</label>
            <span>{stream.location}</span>
          </div>
          <div className="info-item">
            <label>Duration:</label>
            <span>{formatDuration(stream.start_time)}</span>
          </div>
          <div className="info-item">
            <label>Bins Collected:</label>
            <span>{stream.bins_collected || 0}</span>
          </div>
          <div className="info-item">
            <label>Collection Progress:</label>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${Math.min((stream.bins_collected || 0) * 10, 100)}%` }}
              ></div>
            </div>
            <span>{Math.min((stream.bins_collected || 0) * 10, 100)}%</span>
          </div>
        </div>
      </div>
      <div className="stream-actions">
        {stream.has_live_video && (
          <button className="btn btn-primary" onClick={handleWatchLive}>
            <i className="fas fa-play"></i> Watch Live
          </button>
        )}
        <button className="btn btn-secondary" onClick={handleTrackRoute}>
          <i className="fas fa-map-marker-alt"></i> Track Route
        </button>
        <button className="btn btn-info">
          <i className="fas fa-info-circle"></i> Details
        </button>
      </div>
    </div>
  );
});

function Citizen() {
  const [complaints, setComplaints] = useState([]);
  const [bins, setBins] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [desc, setDesc] = useState("");
  const [binId, setBinId] = useState("");
  const [location, setLocation] = useState("");
  const [activeTab, setActiveTab] = useState("complaints");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [userLocation, setUserLocation] = useState([12.9716, 77.5946]);
  const [showProfile, setShowProfile] = useState(false);
  const [priority, setPriority] = useState("medium");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [navigationMode, setNavigationMode] = useState(null);
  const [routeFrom, setRouteFrom] = useState(null);
  const [routeTo, setRouteTo] = useState(null);
  const [liveVideoUrl, setLiveVideoUrl] = useState(null);
  const [showLiveVideo, setShowLiveVideo] = useState(false);
   const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [complaintImages, setComplaintImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [activeLiveStreams, setActiveLiveStreams] = useState([]);
  const [liveMonitoringTab, setLiveMonitoringTab] = useState('streams');
  
  // Added missing state variables
  const [currentRouteLocation, setCurrentRouteLocation] = useState('');
  const [showTrackRouteModal, setShowTrackRouteModal] = useState(false);
  const [selectedStreamForRoute, setSelectedStreamForRoute] = useState(null);
  
  // Schedule state variables
  const [regularSchedules, setRegularSchedules] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleView, setScheduleView] = useState('regular'); // 'regular' or 'tasks'
  
  const fileInputRef = useRef(null);
  const mapRef = useRef();

  // Function to generate unique IDs
  const generateUniqueId = () => {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  };

  // Safe number formatting function
  const safeToFixed = (value, decimals = 4) => {
    if (value === null || value === undefined) return 'Unknown';
    const num = parseFloat(value);
    return isNaN(num) ? 'Unknown' : num.toFixed(decimals);
  };

  // Enhanced data loading function
  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load user profile
      await loadUserProfile();
      
      // Load all data including live streams and schedules
      await Promise.all([
        fetchComplaints(),
        fetchBins(),
        fetchDrivers(),
        fetchNotifications(),
        fetchLiveStreams(),
        fetchSchedules() // Fetch schedules
      ]);
      
      getUserLocation();
      
    } catch (error) {
      console.error("Error loading data:", error);
      setError("Failed to load data. Please check your connection and try again.");
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  // Load data from backend
  useEffect(() => {
    loadData();

    // Set up intervals for live updates
    const driverInterval = setInterval(updateDriverLocations, 10000);
    const streamInterval = setInterval(fetchLiveStreams, 15000);
    const scheduleInterval = setInterval(fetchSchedules, 30000); // Refresh schedules every 30 seconds

    // Add Font Awesome
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
    document.head.appendChild(link);

    return () => {
      clearInterval(driverInterval);
      clearInterval(streamInterval);
      clearInterval(scheduleInterval);
    };
  }, []);

  // Fetch schedules function
  const fetchSchedules = async () => {
    try {
      setScheduleLoading(true);
      
      // Fetch regular schedules from admin
      const regularResponse = await citizenAPI.getRegularSchedules();
      if (regularResponse.data.success) {
        setRegularSchedules(regularResponse.data.data || []);
      } else {
        throw new Error(regularResponse.data.message || 'Failed to fetch regular schedules');
      }

    } catch (error) {
      console.error("Error fetching schedules:", error);
      // Load demo schedule data if API fails
      loadDemoScheduleData();
    } finally {
      setScheduleLoading(false);
    }
  };

  // Demo schedule data
  const loadDemoScheduleData = () => {
    const demoRegularSchedules = [
      {
        id: 1,
        area: "TC Palya Main Road",
        day: "Monday",
        time: "08:00",
        frequency: "weekly",
        assigned_driver: "Mike Johnson",
        status: "active",
        created_at: new Date().toISOString(),
        driver_id: 1,
        bin_ids: [1, 2],
        total_bins: 2,
        priority: "medium"
      },
      {
        id: 2,
        area: "Whitefield Area",
        day: "Wednesday",
        time: "10:00",
        frequency: "weekly",
        assigned_driver: "Sarah Wilson",
        status: "active",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        driver_id: 2,
        bin_ids: [3, 4],
        total_bins: 2,
        priority: "medium"
      },
      {
        id: 3,
        area: "Marathahalli",
        day: "Friday",
        time: "14:00",
        frequency: "bi-weekly",
        assigned_driver: "Rajesh Kumar",
        status: "active",
        created_at: new Date(Date.now() - 172800000).toISOString(),
        driver_id: 3,
        bin_ids: [5],
        total_bins: 1,
        priority: "low"
      }
    ];

    setRegularSchedules(demoRegularSchedules);
  };

  // Fetch live streams from backend
  const fetchLiveStreams = async () => {
    try {
      const response = await liveStreamAPI.getActiveStreams();
      if (response.data.success) {
        // Ensure all streams have unique IDs
        const streamsWithUniqueIds = response.data.data.map((stream, index) => ({
          ...stream,
          uniqueId: generateUniqueId(), // Always generate unique ID
          originalId: stream.id // Keep original ID for reference
        }));
        setActiveLiveStreams(streamsWithUniqueIds);
      } else {
        throw new Error(response.data.message || 'Failed to fetch live streams');
      }
    } catch (error) {
      console.error("Error fetching live streams:", error);
      // Use demo live streams data with unique IDs
      setActiveLiveStreams([
        {
          uniqueId: generateUniqueId(),
          originalId: 1,
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
          uniqueId: generateUniqueId(),
          originalId: 2,
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
      ]);
    }
  };

  // Function to simulate live driver location updates
  const updateDriverLocations = () => {
    setDrivers(prevDrivers => 
      prevDrivers.map(driver => {
        // Add small random movement to simulate real-time updates
        const latChange = (Math.random() - 0.5) * 0.001;
        const lngChange = (Math.random() - 0.5) * 0.001;
        
        return {
          ...driver,
          latitude: driver.latitude + latChange,
          longitude: driver.longitude + lngChange,
          lastUpdate: new Date().toLocaleTimeString(),
          speed: `${Math.floor(Math.random() * 20) + 15} km/h`
        };
      })
    );
  };

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await citizenAPI.getProfile();
      if (response.data.success) {
        const freshUser = response.data.profile;
        setUser(freshUser);
        localStorage.setItem('user', JSON.stringify(freshUser));
      } else {
        throw new Error(response.data.message || 'Failed to load profile');
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      // Check if user data exists in localStorage as fallback
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      } else {
        // Create demo user if no data exists
        const demoUser = {
          name: "John Doe",
          email: "john.doe@example.com",
          phone: "+1 (555) 123-4567",
          address: "123 Main Street, Bangalore, Karnataka 560001",
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        };
        setUser(demoUser);
      }
    }
  };

  const loadDemoData = () => {
    // Demo bins data with unique IDs
    setBins([
      {
        uniqueId: generateUniqueId(),
        id: 1,
        location: "TC Palya",
        status: "full",
        capacity: "120L",
        last_emptied: new Date().toISOString(),
        latitude: 13.0191,
        longitude: 77.7037
      },
      {
        uniqueId: generateUniqueId(),
        id: 2,
        location: "Whitefield, Near Post Office",
        status: "half-full",
        capacity: "100L",
        last_emptied: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        latitude: 12.9698,
        longitude: 77.7500
      }
    ]);
    
    // Demo drivers data with UNIQUE IDs
    const demoDrivers = [
      {
        uniqueId: generateUniqueId(),
        id: 1,
        name: "Mike Johnson",
        vehicle: "Garbage Truck #25",
        latitude: 13.0191,
        longitude: 77.7037,
        status: "active",
        phone: "+1 (555) 123-4567",
        liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw",
        speed: "20 km/h",
        lastUpdate: new Date().toLocaleTimeString(),
        route: "Central Route"
      },
      {
        uniqueId: generateUniqueId(),
        id: 2,
        name: "Sarah Wilson",
        vehicle: "Garbage Truck #18",
        latitude: 12.9896,
        longitude: 77.7127,
        status: "active",
        phone: "+1 (555) 987-6543",
        liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw",
        speed: "18 km/h",
        lastUpdate: new Date().toLocaleTimeString(),
        route: "Market Route"
      },
      {
        uniqueId: generateUniqueId(),
        id: 3,
        name: "Rakesh Kumar",
        vehicle: "Garbage Truck #42",
        latitude: 12.9308,
        longitude: 77.5839,
        status: "active",
        phone: "+1 (555) 456-7890",
        liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw",
        speed: "22 km/h",
        lastUpdate: new Date().toLocaleTimeString(),
        route: "Residential Route"
      }
    ];
    
    // Demo notifications with unique IDs
    const demoNotifications = [
      {
        uniqueId: generateUniqueId(),
        id: 1,
        title: "Live Collection Started",
        message: "Driver Mike Johnson is collecting bins in your area",
        time: "5 mins ago",
        type: "collection",
        driverId: 1,
        read: false,
        created_at: new Date().toISOString()
      },
      {
        uniqueId: generateUniqueId(),
        id: 2,
        title: "Bin Status Update",
        message: "Bin #2 at Market Street is now half-full",
        time: "1 hour ago",
        type: "bin_update",
        read: true,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ];

    setDrivers(demoDrivers);
    setNotifications(demoNotifications);
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Error getting location:", error);
          // Default to Bangalore coordinates
          setUserLocation([12.9716, 77.5946]);
        }
      );
    }
  };

  const fetchComplaints = async () => {
    try {
      const response = await complaintsAPI.getByUser();
      if (response.data.success) {
        // Add unique IDs to complaints
        const complaintsWithUniqueIds = response.data.data.map(complaint => ({
          ...complaint,
          uniqueId: generateUniqueId()
        }));
        setComplaints(complaintsWithUniqueIds);
      } else {
        throw new Error(response.data.message || 'Failed to fetch complaints');
      }
    } catch (error) {
      console.error("Error fetching complaints:", error);
      // Set empty array for complaints if API fails
      setComplaints([]);
    }
  };

  const fetchBins = async () => {
    try {
      loadDemoData();
    } catch (error) {
      console.error("Error fetching bins:", error);
    }
  };

  const fetchDrivers = async () => {
    try {
      loadDemoData();
    } catch (error) {
      console.error("Error fetching drivers:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getByUser();
      if (response.data.success) {
        const notificationsWithTime = response.data.data.map(notification => ({
          ...notification,
          uniqueId: generateUniqueId(),
          time: getTimeAgo(notification.created_at)
        }));
        setNotifications(notificationsWithTime);
      } else {
        throw new Error(response.data.message || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      loadDemoData();
    }
  };
  // Add this function to mark notifications as read
const markNotificationAsRead = async (notificationId) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

const markAllNotificationsAsRead = () => {
  // Update all notifications to read in local state
  setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
  setUnreadNotifications(0);
};

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setComplaintImages(prev => [...prev, ...validFiles]);
      setError('');
    }
  };

  const removeImage = (index) => {
    setComplaintImages(prev => prev.filter((_, i) => i !== index));
  };

  const triggerImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const submitComplaint = async () => {
    if (!desc.trim()) {
      setError("Please enter a complaint description");
      return;
    }

    if (!location.trim()) {
      setError("Please enter the location");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      console.log("Submitting complaint with description:", desc);
      console.log("Location:", location);
      console.log("Priority:", priority);
      console.log("Images count:", complaintImages.length);

      // If there are images, use FormData
      if (complaintImages.length > 0) {
        const formData = new FormData();
        formData.append('description', desc.trim());
        formData.append('location', location.trim());
        formData.append('priority', priority);
        formData.append('latitude', userLocation[0].toString());
        formData.append('longitude', userLocation[1].toString());
        
        if (binId && binId.trim()) {
          formData.append('bin_id', binId.trim());
        }

        // Append images
        complaintImages.forEach((image, index) => {
          formData.append('images', image);
        });

        const response = await complaintsAPI.create(formData);
        
        if (response.data.success) {
          handleComplaintSuccess(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to submit complaint');
        }
      } else {
        const complaintData = {
          description: desc.trim(),
          location: location.trim(),
          priority: priority,
          latitude: userLocation[0],
          longitude: userLocation[1],
          bin_id: binId.trim() || null
        };

        const response = await complaintsAPI.create(complaintData);
        
        if (response.data.success) {
          handleComplaintSuccess(response.data.data);
        } else {
          throw new Error(response.data.message || 'Failed to submit complaint');
        }
      }
    } catch (err) {
      console.error("Error submitting complaint:", err);
      console.error("Error details:", err.response?.data);
      
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          "Failed to submit complaint. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintSuccess = (newComplaint) => {
    const complaintWithUniqueId = {
      ...newComplaint,
      uniqueId: generateUniqueId()
    };
    setComplaints([complaintWithUniqueId, ...complaints]);
    setSuccess("Complaint submitted successfully!");
    setDesc("");
    setLocation("");
    setBinId("");
    setPriority("medium");
    setComplaintImages([]);
    
    // Refresh notifications to show new complaint notification
    fetchNotifications();
    
    setTimeout(() => setSuccess(""), 3000);
  };

  const handleDriverClick = (driver) => {
    setSelectedDriver(driver);
    setShowLiveVideo(true);
    setLiveVideoUrl(driver.liveVideo);
  };

  // Enhanced watch live video function
  const watchLiveVideo = useCallback((stream) => {
    const demoVideoUrl = "https://www.youtube.com/embed/PThI4w7RhYQ";
    setLiveVideoUrl(demoVideoUrl);
    setShowLiveVideo(true);
    setSelectedDriver({
      name: stream.driver_name,
      vehicle: stream.vehicle_info,
      status: stream.status,
      latitude: stream.coordinates?.latitude,
      longitude: stream.coordinates?.longitude
    });
  }, []);

  // Enhanced track route function - FIXED: Now properly shows line from user to driver
  const handleTrackRoute = useCallback((stream) => {
    console.log("Track route clicked for:", stream.driver_name);
    console.log("User location:", userLocation);
    console.log("Driver coordinates:", stream.coordinates);
    
    if (stream.coordinates) {
      const driverCoords = [stream.coordinates.latitude, stream.coordinates.longitude];
      
      // Set all state updates at once
      setSelectedStreamForRoute(stream);
      setNavigationMode('driver');
      setRouteFrom([...userLocation]); // Create new array to ensure re-render
      setRouteTo([...driverCoords]); // Create new array to ensure re-render
      
      console.log("Route from:", userLocation, "to:", driverCoords);
      
      setActiveTab('map');
      
      // Use setTimeout to ensure state updates before map operations
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.flyTo(driverCoords, 16);
        }
      }, 100);
    } else {
      console.error("No coordinates available for driver:", stream.driver_name);
    }
  }, [userLocation]);

  // Added missing function
  const closeTrackRouteModal = useCallback(() => {
    setShowTrackRouteModal(false);
    setCurrentRouteLocation('');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = "/auth";
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in-progress': return 'status-in-progress';
      case 'resolved': return 'status-resolved';
      default: return 'status-pending';
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const getBinStatusClass = (status) => {
    switch (status) {
      case 'empty': return 'bin-status-empty';
      case 'half-full': return 'bin-status-half-full';
      case 'full': return 'bin-status-full';
      default: return 'bin-status-empty';
    }
  };

  const getScheduleStatusClass = (status) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'scheduled': return 'status-scheduled';
      case 'completed': return 'status-completed';
      default: return 'status-pending';
    }
  };

  const complaintStats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in-progress').length,
    resolved: complaints.filter(c => c.status === 'resolved').length
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return formatDate(dateString);
  };

  const closeLiveVideo = () => {
    setShowLiveVideo(false);
    setLiveVideoUrl(null);
    setSelectedDriver(null); // Reset selected driver when closing
  };
  
  // Schedule statistics - REMOVED task schedules
  const scheduleStats = {
    totalRegular: regularSchedules.length
  };

  if (!user && loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="citizen-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <i className="fas fa-recycle logo-icon"></i>
            <h1>
              <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                WasteWise
              </a>
            </h1>
            <p>Citizen Dashboard</p>
            <p>Complaint and track progress</p>
          </div>
          
          <div className="user-section">
                     <div className="notification-bell">
            <button 
              className="btn-icon"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <i className="fas fa-bell"></i>
              {unreadNotifications > 0 && (
                <span className="notification-badge">{unreadNotifications}</span>
              )}
            </button>
          </div>
            <button 
              className="btn-profile"
              onClick={() => setShowProfile(!showProfile)}
            >
              <i className="fas fa-user-circle"></i>
              <span>{user?.name || 'User'}</span>
            </button>
            
            <button className="btn-logout" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt"></i>
              Logout
            </button>
          </div>
        </div>
        
        {showProfile && user && (
          <div className="profile-dropdown">
            <div className="profile-info">
              <div className="profile-image-section">
                <div className="profile-image-container">
                  <div className="profile-image-placeholder">
                    <i className="fas fa-user"></i>
                  </div>
                </div>
                <h3>{user.name}</h3>
              </div>
              
              <div className="profile-details">
                <p><i className="fas fa-envelope"></i> {user.email}</p>
                <p><i className="fas fa-phone"></i> {user.phone || 'Not provided'}</p>
                <p><i className="fas fa-map-marker-alt"></i> {user.address || 'Not provided'}</p>
                <p><i className="fas fa-calendar"></i> Member since: {user.created_at ? formatDate(user.created_at) : 'Unknown'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Dropdown */}
       {showNotifications && (
  <div className="notifications-dropdown">
    <div className="notifications-header">
      <h3>Notifications</h3>
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
        notifications.map((notification, index) => {
          // Create unique key that handles all cases
          const uniqueKey = notification.id 
            ? `notification-${notification.id}`
            : `notification-${index}-${notification.created_at || Date.now()}`;
          
          return (
            <div 
              key={uniqueKey}
              className={`notification-item ${notification.priority || 'medium'} ${notification.is_read ? 'read' : 'unread'}`}
              onClick={() => notification.id && markNotificationAsRead(notification.id)}
            >
              <div className="notification-icon">
                <i className={`fas ${
                  notification.type === 'collection_scheduled' ? 'fa-calendar-check' :
                  notification.type === 'schedule_updated' ? 'fa-calendar-alt' :
                  notification.type === 'schedule_cancelled' ? 'fa-calendar-times' :
                  notification.type === 'complaint' ? 'fa-exclamation-circle' :
                  notification.type === 'collection' ? 'fa-truck' :
                  notification.type === 'bin_update' ? 'fa-trash' :
                  'fa-bell'
                }`}></i>
              </div>
              
              <div className="notification-content">
                <h4>{notification.title}</h4>
                <p>{notification.message}</p>
                <span className="notification-time">
                  {notification.created_at ? getTimeAgo(notification.created_at) : 'Recently'}
                </span>
              </div>
              
              {!notification.is_read && <div className="notification-dot"></div>}
            </div>
          );
        })
      )}
    </div>
  </div>
)}
      </header>
      
      {/* Live Video Modal */}
      {showLiveVideo && (
        <div className="modal-overlay" onClick={closeLiveVideo}>
          <div className="modal-content video-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-truck"></i> Live Collection Video</h2>
              <button className="modal-close" onClick={closeLiveVideo}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <div className="live-video-container">
                {liveVideoUrl ? (
                  <iframe 
                    src={liveVideoUrl}
                    title="Live collection video"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                ) : (
                  <div className="video-placeholder">
                    <i className="fas fa-video-slash"></i>
                    <p>No live video available</p>
                  </div>
                )}
              </div>
              
              <div className="video-info">
                <h3>Driver: {selectedDriver?.name || 'Unknown'}</h3>
                <p><strong>Vehicle:</strong> {selectedDriver?.vehicle || 'Not specified'}</p>
                <p><strong>Status:</strong> <span className="driver-status-active">{selectedDriver?.status}</span></p>
                <p><strong>Current Location:</strong> {safeToFixed(selectedDriver?.latitude)}, {safeToFixed(selectedDriver?.longitude)}</p>
                <p><strong>Speed:</strong> {selectedDriver?.speed || 'Unknown'}</p>
                <p><strong>Last Update:</strong> {selectedDriver?.lastUpdate || 'Unknown'}</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-primary" onClick={closeLiveVideo}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track Route Modal */}
      {showTrackRouteModal && (
        <div className="modal-overlay" onClick={closeTrackRouteModal}>
          <div className="modal-content track-route-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-map-marker-alt"></i> Track Route: {currentRouteLocation}
              </h3>
              <button className="modal-close" onClick={closeTrackRouteModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="map-container">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(currentRouteLocation)}`}
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Route Tracking Map"
                ></iframe>
                <div className="map-info">
                  <p><strong>Current Location:</strong> {currentRouteLocation}</p>
                  <p><strong>Estimated Arrival:</strong> 15 minutes</p>
                  <p><strong>Route Status:</strong> <span className="status-active">Active</span></p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={closeTrackRouteModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="sidebar-nav">
            <ul>
              <li>
                <button 
                  className={`nav-item ${activeTab === "complaints" ? "active" : ""}`}
                  onClick={() => setActiveTab("complaints")}
                >
                  <i className="fas fa-exclamation-circle"></i>
                  <span>Complaints</span>
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === "map" ? "active" : ""}`}
                  onClick={() => setActiveTab("map")}
                >
                  <i className="fas fa-map-marker-alt"></i>
                  <span>Smart Bins Map</span>
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === "live" ? "active" : ""}`}
                  onClick={() => setActiveTab("live")}
                >
                  <i className="fas fa-video"></i>
                  <span>Live Monitoring</span>
                </button>
              </li>
              <li>
                <button 
                  className={`nav-item ${activeTab === "schedule" ? "active" : ""}`}
                  onClick={() => setActiveTab("schedule")}
                >
                  <i className="fas fa-calendar-alt"></i>
                  <span>Collection Schedule</span>
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div className="main-content">
          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
            </div>
          )}
          
          {success && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle"></i>
              {success}
            </div>
          )}

          {/* Complaints Tab */}
          {activeTab === "complaints" && (
            <div className="tab-content">
              <div className="tab-header">
                <h2>Submit a Complaint</h2>
                <p>Report issues with waste bins in your area</p>
              </div>

              <div className="complaint-form">
                <div className="form-group">
                  <label htmlFor="description">Complaint Description *</label>
                  <textarea
                    id="description"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Describe the issue in detail (e.g., overflowing bin, damaged bin, etc.)"
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location *</label>
                  <input
                    type="text"
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Enter the exact location of the issue"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="priority">Priority Level</label>
                    <select 
                      id="priority"
                      value={priority} 
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="binId">Bin ID (Optional)</label>
                    <input
                      type="text"
                      id="binId"
                      value={binId}
                      onChange={(e) => setBinId(e.target.value)}
                      placeholder="Enter bin ID if known"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Upload Photos as Evidence</label>
                  <div className="image-upload-section">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      multiple
                      style={{ display: 'none' }}
                    />
                    
                    <button 
                      className="btn-image-upload"
                      onClick={triggerImageUpload}
                      disabled={uploadingImages}
                    >
                      <i className="fas fa-camera"></i>
                      {uploadingImages ? 'Uploading...' : 'Select Images'}
                    </button>
                    
                    <span className="upload-hint">Maximum 3 images, 5MB each</span>
                  </div>

                  {complaintImages.length > 0 && (
                    <div className="image-preview-container">
                      <h4>Selected Images ({complaintImages.length})</h4>
                      <div className="image-preview-grid">
                        {complaintImages.map((image, index) => (
                          <div key={`image-${index}`} className="image-preview-item">
                            <img 
                              src={URL.createObjectURL(image)} 
                              alt={`Complaint evidence ${index + 1}`}
                            />
                            <button 
                              className="remove-image-btn"
                              onClick={() => removeImage(index)}
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button 
                  className="btn-primary btn-submit"
                  onClick={submitComplaint}
                  disabled={loading || !desc.trim() || !location.trim()}
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Submit Complaint
                    </>
                  )}
                </button>
              </div>

              <div className="complaints-stats">
                <div className="stat-card">
                  <div className="stat-icon total">
                    <i className="fas fa-list"></i>
                  </div>
                  <div className="stat-info">
                    <h3>{complaintStats.total}</h3>
                    <p>Total Complaints</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon pending">
                    <i className="fas fa-clock"></i>
                  </div>
                  <div className="stat-info">
                    <h3>{complaintStats.pending}</h3>
                    <p>Pending</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon in-progress">
                    <i className="fas fa-spinner"></i>
                  </div>
                  <div className="stat-info">
                    <h3>{complaintStats.inProgress}</h3>
                    <p>In Progress</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon resolved">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <div className="stat-info">
                    <h3>{complaintStats.resolved}</h3>
                    <p>Resolved</p>
                  </div>
                </div>
              </div>

              <div className="complaints-list">
                <h3>My Recent Complaints</h3>
                
                {complaints.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>No complaints submitted yet</p>
                  </div>
                ) : (
                  <div className="complaints-grid">
                    {complaints.map(complaint => (
                      <div key={`complaint-${complaint.uniqueId}`} className="complaint-card">
                        <div className="complaint-header">
                          <span className={`status-badge ${getStatusClass(complaint.status)}`}>
                            {complaint.status}
                          </span>
                          <span className={`priority-badge ${getPriorityClass(complaint.priority)}`}>
                            {complaint.priority}
                          </span>
                        </div>
                        
                        <div className="complaint-body">
                          <p className="complaint-description">{complaint.description}</p>
                          <p className="complaint-location">
                            <i className="fas fa-map-marker-alt"></i> {complaint.location}
                          </p>
                          
                          {complaint.images && complaint.images.length > 0 && (
                            <div className="complaint-images">
                              <h4>Evidence Photos:</h4>
                              <div className="complaint-images-grid">
                                {complaint.images.map((image, index) => (
                                  <div key={`complaint-image-${index}`} className="complaint-image-item">
                                    <img 
                                      src={image.path || URL.createObjectURL(image)} 
                                      alt={`Evidence ${index + 1}`}
                                      onClick={() => window.open(image.path || URL.createObjectURL(image), '_blank')}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {complaint.bin_id && (
                            <p className="complaint-bin">Bin ID: {complaint.bin_id}</p>
                          )}
                        </div>
                        
                        <div className="complaint-footer">
                          <span className="complaint-date">
                            {formatDate(complaint.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Map Tab */}
          {activeTab === "map" && (
            <div className="tab-content">
              <div className="tab-header">
                <h2><i className="fas fa-map-marked-alt"></i> Smart Bins Map</h2>
                <p>View real-time status of waste bins and collection vehicles in your area</p>
                {selectedStreamForRoute && (
                  <div className="route-info-banner">
                    <i className="fas fa-route"></i>
                    <span>Showing route to {selectedStreamForRoute.driver_name} - {selectedStreamForRoute.vehicle_info}</span>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setSelectedStreamForRoute(null);
                        setNavigationMode(null);
                        setRouteFrom(null);
                        setRouteTo(null);
                      }}
                    >
                      Clear Route
                    </button>
                  </div>
                )}
              </div>

              <div className="map-container">
                <MapContainer
                  center={userLocation}
                  zoom={15}
                  style={{ height: "500px", width: "100%" }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  <LocationMarker />
                  
                  {bins.map(bin => (
                    <Marker
                      key={`bin-${bin.uniqueId}`}
                      position={[bin.latitude, bin.longitude]}
                      icon={createCustomIcon(bin.status)}
                    >
                      <Popup>
                        <div className="bin-popup">
                          <h3><i className="fas fa-trash-alt"></i> Bin #{bin.id}</h3>
                          <p><strong>Location:</strong> {bin.location}</p>
                          <p><strong>Status:</strong> <span className={getBinStatusClass(bin.status)}>{bin.status}</span></p>
                          <p><strong>Capacity:</strong> {bin.capacity}</p>
                          <p><strong>Last Emptied:</strong> {formatDate(bin.last_emptied)}</p>
                          <button 
                            className="btn-primary btn-sm"
                            onClick={() => {
                              setDesc(`Issue with Bin #${bin.id} at ${bin.location}`);
                              setBinId(`BIN${bin.id}`);
                              setActiveTab("complaints");
                            }}
                          >
                            <i className="fas fa-exclamation-circle"></i> Report Issue
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  
                  <DriverLocations 
                    drivers={drivers} 
                    onDriverClick={handleDriverClick}
                  />
                  
                  {/* Show active live streams on map */}
                  {activeLiveStreams.map(stream => (
                    stream.coordinates && (
                      <Marker
                        key={`stream-${stream.uniqueId}`}
                        position={[stream.coordinates.latitude, stream.coordinates.longitude]}
                        icon={driverIcon}
                        eventHandlers={{
                          click: () => watchLiveVideo(stream)
                        }}
                      >
                        <Popup>
                          <div className="stream-popup">
                            <h3><i className="fas fa-truck"></i> {stream.driver_name}</h3>
                            <p><strong>Vehicle:</strong> {stream.vehicle_info}</p>
                            <p><strong>Status:</strong> <span className={`status-${stream.status}`}>{stream.status}</span></p>
                            <p><strong>Bins Collected:</strong> {stream.bins_collected || 0}</p>
                            <p><strong>Location:</strong> {stream.location}</p>
                            {stream.has_live_video && (
                              <button 
                                className="btn-primary btn-sm"
                                onClick={() => watchLiveVideo(stream)}
                              >
                                <i className="fas fa-video"></i> Watch Live
                              </button>
                            )}
                            <button 
                              className="btn-secondary btn-sm"
                              onClick={() => handleTrackRoute(stream)}
                            >
                              <i className="fas fa-route"></i> Show Route
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))}
                  
                  {/* Show direction line from user to selected driver - FIXED: Now properly shows line */}
                  {navigationMode && routeFrom && routeTo && (
                    <RouteLine from={routeFrom} to={routeTo} color="#6f42c1" />
                  )}
                </MapContainer>
              </div>

              <div className="map-controls">
                <div className="map-legend">
                  <h4>Map Legend</h4>
                  <div className="legend-items">
                    <div className="legend-item">
                      <div className="legend-color user-location"></div>
                      <span>Your Location</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color bin-empty"></div>
                      <span>Empty Bin</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color bin-half-full"></div>
                      <span>Half Full Bin</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color bin-full"></div>
                      <span>Full Bin</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-color driver"></div>
                      <span>Collection Driver</span>
                    </div>
                    {navigationMode && (
                      <div className="legend-item">
                        <div className="legend-color route-line"></div>
                        <span>Route to Driver</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="live-drivers">
                  <h4>Active Drivers</h4>
                  <div className="drivers-list">
                    {activeLiveStreams.map(driver => (
                      <div key={`driver-list-${driver.uniqueId}`} className="driver-list-item">
                        <div className="driver-marker"></div>
                        <div className="driver-info">
                          <h5>{driver.driver_name}</h5>
                          <p>{driver.vehicle_info}</p>
                          <span className="driver-status">
                            <i className="fas fa-circle"></i> 
                            {driver.status} • {driver.bins_collected || 0} bins
                          </span>
                        </div>
                        <div className="driver-actions">
                          <button 
                            className="btn-icon"
                            onClick={() => {
                              if (mapRef.current && driver.coordinates) {
                                mapRef.current.flyTo([driver.coordinates.latitude, driver.coordinates.longitude], 18);
                              }
                            }}
                          >
                            <i className="fas fa-location-arrow"></i>
                          </button>
                          {driver.has_live_video && (
                            <button 
                              className="btn-icon"
                              onClick={() => watchLiveVideo(driver)}
                            >
                              <i className="fas fa-video"></i>
                            </button>
                          )}
                          <button 
                            className="btn-icon"
                            onClick={() => handleTrackRoute(driver)}
                            >
                            <i className="fas fa-route"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bins-list">
                <h3>Nearby Bins</h3>
                <div className="bins-grid">
                  {bins.map(bin => (
                    <div key={`bin-card-${bin.uniqueId}`} className="bin-card">
                      <div className="bin-header">
                        <h4>Bin #{bin.id}</h4>
                        <span className={`status-badge ${getBinStatusClass(bin.status)}`}>
                          {bin.status}
                        </span>
                      </div>
                      <p className="bin-location">{bin.location}</p>
                      <div className="bin-details">
                        <span><i className="fas fa-weight-hanging"></i> {bin.capacity}</span>
                        <span><i className="fas fa-clock"></i> {getTimeAgo(bin.last_emptied)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Monitoring Tab */}
          {activeTab === "live" && (
            <div className="tab-content">
              <div className="tab-header">
                <h2><i className="fas fa-video"></i> Live Collection Monitoring</h2>
                <p>Watch real-time waste collection activities in your area</p>
              </div>

              <div className="live-monitoring-tabs">
                <div className="monitoring-tabs-header">
                  <button 
                    className={`monitoring-tab ${liveMonitoringTab === 'streams' ? 'active' : ''}`}
                    onClick={() => setLiveMonitoringTab('streams')}
                  >
                    <i className="fas fa-video"></i> Live Streams
                  </button>
                  <button 
                    className={`monitoring-tab ${liveMonitoringTab === 'drivers' ? 'active' : ''}`}
                    onClick={() => setLiveMonitoringTab('drivers')}
                  >
                    <i className="fas fa-truck"></i> Active Drivers
                  </button>
                </div>

                {/* Live Streams View */}
                {liveMonitoringTab === 'streams' && (
                  <div className="live-streams-view">
                    <div className="live-stats-header">
                      <div className="live-stat">
                        <span className="live-dot"></span>
                        <span>{activeLiveStreams.length} Active Collections</span>
                      </div>
                      <div className="live-stat">
                        <span>Total Bins Collected Today: {activeLiveStreams.reduce((sum, stream) => sum + (stream.bins_collected || 0), 0)}</span>
                      </div>
                    </div>

                    <div className="live-streams-grid">
                      {activeLiveStreams.map(stream => (
                        <StreamCard
                          key={`stream-card-${stream.uniqueId}`}
                          stream={stream}
                          onWatchLive={watchLiveVideo}
                          onTrackRoute={handleTrackRoute}
                        />
                      ))}
                    </div>

                    {activeLiveStreams.length === 0 && (
                      <div className="no-live-streams">
                        <i className="fas fa-video-slash"></i>
                        <h3>No Active Live Streams</h3>
                        <p>There are currently no active collection streams in your area.</p>
                        <button className="btn-primary" onClick={fetchLiveStreams}>
                          <i className="fas fa-sync-alt"></i> Refresh
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Drivers View */}
                {liveMonitoringTab === 'drivers' && (
                  <div className="active-drivers-view">
                    <h3>Active Collection Drivers</h3>
                    <div className="drivers-grid">
                      {activeLiveStreams.map(driver => (
                        <div key={`driver-card-${driver.uniqueId}`} className="driver-card">
                          <div className="driver-header">
                            <div className="driver-avatar">
                              <i className="fas fa-user"></i>
                            </div>
                            <div className="driver-info">
                              <h3>{driver.driver_name}</h3>
                              <p className="driver-vehicle">{driver.vehicle_info}</p>
                              <span className={`driver-status ${driver.status}`}>
                                <i className="fas fa-circle"></i> {driver.status}
                              </span>
                            </div>
                          </div>

                          <div className="driver-stats">
                            <div className="stat">
                              <i className="fas fa-map-marker-alt"></i>
                              <div>
                                <span className="stat-value">{driver.location}</span>
                                <span className="stat-label">Current Location</span>
                              </div>
                            </div>
                            <div className="stat">
                              <i className="fas fa-trash"></i>
                              <div>
                                <span className="stat-value">{driver.bins_collected || 0} bins</span>
                                <span className="stat-label">Collected</span>
                              </div>
                            </div>
                            <div className="stat">
                              <i className="fas fa-clock"></i>
                              <div>
                                <span className="stat-value">{(() => {
                                  if (!driver.start_time) return '0m';
                                  const diff = new Date() - new Date(driver.start_time);
                                  const minutes = Math.floor(diff / 60000);
                                  const hours = Math.floor(minutes / 60);
                                  if (hours > 0) return `${hours}h ${minutes % 60}m`;
                                  return `${minutes}m`;
                                })()}</span>
                                <span className="stat-label">Duration</span>
                              </div>
                            </div>
                          </div>

                          <div className="driver-actions">
                            {driver.has_live_video && (
                              <button 
                                className="btn-primary"
                                onClick={() => watchLiveVideo(driver)}
                              >
                                <i className="fas fa-video"></i> Watch Live
                              </button>
                            )}
                            <button 
                              className="btn-secondary"
                              onClick={() => handleTrackRoute(driver)}
                            >
                              <i className="fas fa-map-marker-alt"></i> View on Map
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule Tab - UPDATED: Removed Task Schedules and action buttons */}
          {activeTab === "schedule" && (
            <div className="tab-content">
              <div className="tab-header">
                <h2><i className="fas fa-calendar-alt"></i> Collection Schedule</h2>
                <p>View regular collection schedules for your area</p>
              </div>

              {/* Schedule Stats - UPDATED: Removed task schedules */}
              <div className="schedule-stats">
                <div className="stat-card">
                  <div className="stat-icon total">
                    <i className="fas fa-calendar"></i>
                  </div>
                  <div className="stat-info">
                    <h3>{scheduleStats.totalRegular}</h3>
                    <p>Regular Schedules</p>
                  </div>
                </div>
              </div>

              {scheduleLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading schedules...</p>
                </div>
              ) : (
                <div className="regular-schedules-view">
                  <h3><i className="fas fa-calendar"></i> Regular Collection Schedules</h3>
                  <p className="section-description">Pre-defined collection schedules for your area</p>
                  
                  {regularSchedules.length === 0 ? (
                    <div className="empty-state">
                      <i className="fas fa-calendar-times"></i>
                      <h4>No Regular Schedules Available</h4>
                      <p>There are no regular collection schedules defined for your area yet.</p>
                      <button className="btn-primary" onClick={fetchSchedules}>
                        <i className="fas fa-sync-alt"></i> Refresh
                      </button>
                    </div>
                  ) : (
                    <div className="schedules-grid">
                      {regularSchedules.map(schedule => (
                        <div key={`regular-${schedule.id}`} className="schedule-card">
                          <div className="schedule-header">
                            <h4>
                              <i className="fas fa-map-marker-alt"></i> {schedule.area}
                            </h4>
                            <span className={`status-badge ${getScheduleStatusClass(schedule.status)}`}>
                              {schedule.status}
                            </span>
                          </div>
                          
                          <div className="schedule-details">
                            <div className="schedule-info">
                              <div className="info-item">
                                <i className="fas fa-calendar-day"></i>
                                <span><strong>Day:</strong> {schedule.day}</span>
                              </div>
                              <div className="info-item">
                                <i className="fas fa-clock"></i>
                                <span><strong>Time:</strong> {schedule.time}</span>
                              </div>
                              <div className="info-item">
                                <i className="fas fa-sync-alt"></i>
                                <span><strong>Frequency:</strong> {schedule.frequency}</span>
                              </div>
                              <div className="info-item">
                                <i className="fas fa-truck"></i>
                                <span><strong>Driver:</strong> {schedule.assigned_driver}</span>
                              </div>
                              <div className="info-item">
                                <i className="fas fa-trash"></i>
                                <span><strong>Bins:</strong> {schedule.total_bins} bins</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="schedule-footer">
                            <span className="schedule-date">
                              <i className="fas fa-calendar-plus"></i> 
                              Created: {formatDate(schedule.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Citizen;