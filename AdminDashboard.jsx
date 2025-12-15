// AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  LineElement, 
  PointElement,
  Filler 
} from 'chart.js';
import { authAPI, adminAPI } from '../services/api';
import './AdminDashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  Filler
);

// EXACT SAME StreamCard 
const StreamCard = React.memo(({ stream, onWatchLive, onTrackRoute, onAlert }) => {
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

  const handleAlert = useCallback(() => {
    onAlert(stream);
  }, [stream, onAlert]);

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
        <button className="btn btn-info" onClick={handleAlert}>
          <i className="fas fa-info-circle"></i> Alert
        </button>
      </div>
    </div>
  );
});

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeManagementTab, setActiveManagementTab] = useState('bins');
  const [stats, setStats] = useState({
    totalBins: 0,
    totalTrucks: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    totalWorkers: 0,
    collectionRate: 0,
    avgResponseTime: '0h'
  });
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [bins, setBins] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [showAdminProfile, setShowAdminProfile] = useState(false);
  const [showAddBinModal, setShowAddBinModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newBin, setNewBin] = useState({ location: '', status: 'empty', capacity: '100L' });
  const [newWorker, setNewWorker] = useState({ name: '', role: 'driver', email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // LIVE STREAM STATES 
  const [activeLiveStreams, setActiveLiveStreams] = useState([]);
  const [liveMonitoringTab, setLiveMonitoringTab] = useState('streams');
  const [showLiveVideo, setShowLiveVideo] = useState(false);
  const [liveVideoUrl, setLiveVideoUrl] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showTrackRouteModal, setShowTrackRouteModal] = useState(false);
  const [selectedStreamForRoute, setSelectedStreamForRoute] = useState(null);
  
  // NEW SCHEDULE STATES
  const [schedules, setSchedules] = useState([]);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    area: '',
    day: 'Monday',
    time: '08:00',
    frequency: 'weekly',
    assigned_driver: '',
    status: 'active'
  });
  
  const [adminProfile, setAdminProfile] = useState({
    name: '',
    email: '',
    role: 'System Administrator',
    phone: '',
    department: 'Waste Management',
    lastLogin: new Date().toLocaleString()
  });
  const [isMounted, setIsMounted] = useState(true);
  const [loadingStates, setLoadingStates] = useState({
    bins: false,
    workers: false,
    complaints: false,
    reports: false,
    liveStreams: false
  });

  // Function to generate unique IDs - SAME AS CITIZEN
  const generateUniqueId = () => {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  };

  // Enhanced API calls with proper error handling and authentication
  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`http://localhost:5000/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      if (response.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API call failed for ${endpoint}:`, error);
      throw error;
    }
  }, []);

  // Set loading state helper
  const setLoadingState = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
  }, []);

  // Load Admin Profile function
  const loadAdminProfile = useCallback(async () => {
    if (!isMounted) return;
    
    try {
      const profileData = await apiCall('/admin/profile');
      if (profileData.success && isMounted) {
        setAdminProfile({
          ...profileData.profile,
          lastLogin: new Date(profileData.profile.updated_at).toLocaleString()
        });
      }
    } catch (error) {
      console.error('Error loading admin profile:', error);
      if (isMounted) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          if (userData.role === 'admin') {
            setAdminProfile({
              name: userData.name || 'Admin User',
              email: userData.email || 'admin@wastewise.com',
              role: 'System Administrator',
              phone: userData.phone || '+1 (555) 123-4567',
              department: 'Waste Management',
              lastLogin: new Date().toLocaleString()
            });
          }
        }
      }
    }
  }, [apiCall, isMounted]);

  // NEW: Load schedules function
  const loadSchedules = useCallback(async () => {
    if (!isMounted) return;
    
    try {
      const schedulesData = await apiCall('/admin/schedules');
      if (schedulesData.success && isMounted) {
        setSchedules(schedulesData.data);
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
      if (isMounted) {
        // Set sample schedules data if API fails
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
        setSchedules(sampleSchedules);
      }
    }
  }, [apiCall, isMounted]);

  // NEW: Add schedule function
  const handleAddSchedule = useCallback(async () => {
    if (!newSchedule.area || !newSchedule.assigned_driver) {
      alert('Please fill in all required fields (Area and Assigned Driver)');
      return;
    }

    try {
      const response = await apiCall('/admin/schedules', {
        method: 'POST',
        body: JSON.stringify(newSchedule)
      });
      
      if (response.success && isMounted) {
        setShowAddScheduleModal(false);
        setNewSchedule({
          area: '',
          day: 'Monday',
          time: '08:00',
          frequency: 'weekly',
          assigned_driver: '',
          status: 'active'
        });
        loadSchedules();
        alert('New schedule added successfully!');
      } else {
        alert(response.message || 'Failed to add schedule');
      }
    } catch (error) {
      console.error('Error adding schedule:', error);
      alert('Failed to add schedule. Please try again.');
    }
  }, [newSchedule, apiCall, isMounted, loadSchedules]);

  // NEW: Delete schedule function
  const handleDeleteSchedule = useCallback(async (scheduleId) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      try {
        await apiCall(`/admin/schedules/${scheduleId}`, {
          method: 'DELETE'
        });
        if (isMounted) {
          loadSchedules();
          alert('Schedule deleted successfully!');
        }
      } catch (error) {
        console.log('API not available, deleting schedule locally');
        // Remove from local state
        setSchedules(prev => prev.filter(schedule => schedule.id !== scheduleId));
        alert('Schedule deleted successfully!');
      }
    }
  }, [apiCall, isMounted, loadSchedules]);

  // NEW: Toggle schedule status function
  const handleToggleScheduleStatus = useCallback(async (scheduleId) => {
    try {
      const schedule = schedules.find(s => s.id === scheduleId);
      const newStatus = schedule.status === 'active' ? 'inactive' : 'active';
      
      await apiCall(`/admin/schedules/${scheduleId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (isMounted) {
        loadSchedules();
        alert(`Schedule ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      }
    } catch (error) {
      console.log('API not available, toggling schedule status locally');
      // Update local state
      setSchedules(prev => prev.map(schedule => 
        schedule.id === scheduleId 
          ? { ...schedule, status: schedule.status === 'active' ? 'inactive' : 'active' }
          : schedule
      ));
      alert('Schedule status updated successfully!');
    }
  }, [schedules, apiCall, isMounted, loadSchedules]);

  // Enhanced refresh live streams function with unique IDs 
  const refreshLiveStreams = useCallback(async () => {
    try {
      setLoadingState('liveStreams', true);
      const liveStreamsData = await apiCall('/admin/live-streams');
      if (liveStreamsData.success && isMounted) {
        // Ensure all streams have unique IDs AND LIVE VIDEO
        const streamsWithUniqueIds = liveStreamsData.data.map((stream, index) => ({
          ...stream,
          uniqueId: generateUniqueId(),
          originalId: stream.id,
          has_live_video: true, // FORCE ALL STREAMS TO HAVE LIVE VIDEO
          liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw"
        }));
        setActiveLiveStreams(streamsWithUniqueIds);
        console.log(`Refreshed! Found ${liveStreamsData.data.length} active live streams`);
      }
    } catch (error) {
      console.error('Failed to refresh live streams:', error);
      if (isMounted) {
        // Set sample data if API fails with unique IDs - ALL WITH LIVE VIDEO
        const sampleStreams = [
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
            last_updated: new Date().toISOString(),
            liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw"
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
            last_updated: new Date().toISOString(),
            liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw"
          }
        ];
        setActiveLiveStreams(sampleStreams);
      }
    } finally {
      setLoadingState('liveStreams', false);
    }
  }, [apiCall, isMounted, setLoadingState]);

  //  WATCH LIVE FUNCTION 
  const watchLiveVideo = useCallback((stream) => {
    const demoVideoUrl = "https://www.youtube.com/embed/PThI4w7RhYQ";
    setLiveVideoUrl(demoVideoUrl);
    setShowLiveVideo(true);
    setSelectedDriver({
      name: stream.driver_name,
      vehicle: stream.vehicle_info,
      status: stream.status,
      latitude: stream.coordinates?.latitude,
      longitude: stream.coordinates?.longitude,
      speed: "25 km/h",
      lastUpdate: new Date().toLocaleTimeString()
    });
  }, []);

  //  TRACK ROUTE FUNCTION 
  const handleTrackRoute = useCallback((stream) => {
    setSelectedStreamForRoute(stream);
    setShowTrackRouteModal(true);
  }, []);

  //  ALERT DRIVER FUNCTION - FIXED
  const handleAlertDriver = useCallback((stream) => {
    alert(`Alert sent to driver: ${stream.driver_name}\nVehicle: ${stream.vehicle_info}\nLocation: ${stream.location}`);
  }, []);

  //  CLOSE LIVE VIDEO FUNCTION
  const closeLiveVideo = () => {
    setShowLiveVideo(false);
    setLiveVideoUrl(null);
    setSelectedDriver(null);
  };

  //  CLOSE TRACK ROUTE MODAL 
  const closeTrackRouteModal = useCallback(() => {
    setShowTrackRouteModal(false);
    setSelectedStreamForRoute(null);
  }, []);

  // Safe number formatting function - 
  const safeToFixed = (value, decimals = 4) => {
    if (value === null || value === undefined) return 'Unknown';
    const num = parseFloat(value);
    return isNaN(num) ? 'Unknown' : num.toFixed(decimals);
  };

  // Generate New Report function
  const handleGenerateNewReport = useCallback(async () => {
    try {
      const reportName = `Custom Report ${new Date().toLocaleDateString()}`;
      const response = await apiCall('/admin/reports', {
        method: 'POST',
        body: JSON.stringify({
          name: reportName,
          type: 'PDF'
        })
      });
      
      if (response.success && isMounted) {
        setReports(prev => [response.data, ...prev]);
        alert('New report generated successfully!');
      } else {
        alert('Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    }
  }, [apiCall, isMounted]);

  // Enhanced Download Individual Report
  const handleDownloadIndividualReport = useCallback(async (reportId, reportName, format = 'pdf') => {
    try {
      console.log(`📥 Downloading individual report: ${reportName} as ${format}`);
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/admin/reports/${reportId}/download?format=${format}`,
        {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Get filename from response or use default
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `report-${reportId}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Refresh reports to update download count
      fetchData();
      
      alert(`Report "${reportName}" downloaded successfully as ${format.toUpperCase()}!`);
      
    } catch (error) {
      console.error(`❌ Error downloading report:`, error);
      alert('Failed to download report. Please try again.');
    }
  }, []);

  // Enhanced Export Report Function with comprehensive data
  const exportReport = useCallback(async (format, reportId = null) => {
    try {
      let content, mimeType, extension, filename;
      
      // Get comprehensive report data
      const totalWorkers = workers.length;
      const activeWorkers = workers.filter(w => w.status === 'active').length;
      const resolvedComplaints = complaints.filter(c => c.status === 'resolved');
      const inProgressComplaints = complaints.filter(c => c.status === 'in-progress');
      const pendingComplaints = complaints.filter(c => c.status === 'pending');
      const emptyBins = bins.filter(b => b.status === 'empty').length;
      const halfFullBins = bins.filter(b => b.status === 'half-full').length;
      const fullBins = bins.filter(b => b.status === 'full').length;

      if (reportId) {
        // Use server download for individual reports
        const report = reports.find(r => r.id === reportId);
        if (!report) {
          alert('Report not found!');
          return;
        }
        handleDownloadIndividualReport(reportId, report.name, format.toLowerCase());
        return;
      } else {
        // Bulk export all reports
        if (format === 'PDF') {
          content = `WASTEWISE MANAGEMENT SYSTEM - ALL REPORTS SUMMARY
=================================================

Generated: ${new Date().toLocaleString()}
Total Reports in System: ${reports.length}

REPORTS LIST:
=============
${reports.map(report => `
REPORT: ${report.name || 'Unnamed Report'}
Type: ${report.type}
Created: ${new Date(report.created_at).toLocaleDateString()}
Downloads: ${report.downloads || 0}
Generated By: ${report.generated_by_name || 'System'}
---`).join('')}

SYSTEM SNAPSHOT:
================
- Total Bins: ${stats.totalBins}
- Collection Trucks: ${stats.totalTrucks}
- Total Workers: ${totalWorkers}
- Active Workers: ${activeWorkers}
- Total Complaints: ${complaints.length}
- Resolved Complaints: ${resolvedComplaints.length}
- Collection Rate: ${stats.collectionRate}%

This is an automated bulk report generated by WasteWise System.`;
          mimeType = 'application/pdf';
          extension = 'pdf';
        } else if (format === 'CSV') {
          content = `Report ID,Report Name,Type,Generated By,Created At,Downloads\n` + 
            reports.map(report => 
              `"${report.id}","${report.name || 'Unnamed Report'}","${report.type}","${report.generated_by_name || 'System'}","${report.created_at}","${report.downloads || 0}"`
            ).join('\n');
          mimeType = 'text/csv';
          extension = 'csv';
        }
        
        filename = `All_Reports_Summary_${new Date().toISOString().split('T')[0]}.${extension}`;
      }

      // Create and trigger download for bulk exports
      if (!reportId) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      alert(`${reportId ? `"${reports.find(r => r.id === reportId)?.name || 'Report'}"` : 'All reports'} downloaded successfully as ${format}!`);
      
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Failed to export report. Please try again.');
    }
  }, [reports, stats, workers, complaints, bins, handleDownloadIndividualReport]);

  // Fixed fetchData function with proper error handling and parallel requests
  const fetchData = useCallback(async () => {
    if (!isMounted) return;
    
    try {
      setLoading(true);
      
      // Use Promise.all for parallel requests with error handling
      const requests = [
        apiCall('/admin/dashboard/stats').catch(err => ({ success: false, data: null })),
        apiCall('/admin/bins').catch(err => ({ success: false, data: [] })),
        apiCall('/admin/workers').catch(err => ({ success: false, data: [] })),
        apiCall('/admin/complaints').catch(err => ({ success: false, data: [] })),
        apiCall('/admin/reports').catch(err => ({ success: false, data: [] })),
        apiCall('/admin/audit-logs').catch(err => ({ success: false, data: [] })),
        apiCall('/notifications').catch(err => ({ success: false, data: [] })),
        apiCall('/admin/live-streams').catch(err => ({ success: false, data: [] }))
      ];

      const [
        statsData,
        binsData,
        workersData,
        complaintsData,
        reportsData,
        auditLogsData,
        notificationsData,
        liveStreamsData
      ] = await Promise.all(requests);

      // Update states only if component is still mounted
      if (isMounted) {
        if (statsData.success) setStats(statsData.data);
        if (binsData.success) setBins(binsData.data);
        if (workersData.success) setWorkers(workersData.data);
        if (complaintsData.success) setComplaints(complaintsData.data);
        if (reportsData.success) setReports(reportsData.data);
        if (auditLogsData.success) setAuditLogs(auditLogsData.data);
        if (notificationsData.success) setNotifications(notificationsData.data);
        
        if (liveStreamsData.success) {
          // Ensure all streams have unique IDs AND LIVE VIDEO
          const streamsWithUniqueIds = liveStreamsData.data.map((stream, index) => ({
            ...stream,
            uniqueId: generateUniqueId(),
            originalId: stream.id,
            has_live_video: true, // FORCE LIVE VIDEO
            liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw"
          }));
          setActiveLiveStreams(streamsWithUniqueIds);
        } else {
          // Set sample data if API fails with unique IDs - ALL WITH LIVE VIDEO
          const sampleStreams = [
            {
              uniqueId: generateUniqueId(),
              originalId: 1,
              driver_name: 'Mike Johnson',
              location: 'TC Palya Main Road',
              status: 'in-progress',
              start_time: new Date(Date.now() - 1800000).toISOString(),
              bins_collected: 8,
              vehicle_info: 'Garbage Truck #25',
              coordinates: { latitude: 13.0191, longitude: 77.7037 },
              has_live_video: true,
              last_updated: new Date().toISOString(),
              liveVideo: "https://www.youtube.com/embed/jNQXAC9IVRw"
            }
          ];
          setActiveLiveStreams(sampleStreams);
        }
      }
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [apiCall, isMounted]);

  // Sample data for charts
  const weeklyData = useMemo(() => ({
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Collections',
        data: [12, 15, 18, 9, 20, 16, 11],
        backgroundColor: 'rgba(74, 100, 145, 0.8)',
        borderColor: 'rgba(74, 100, 145, 1)',
        borderWidth: 1
      }
    ]
  }), []);

  const binStatusData = useMemo(() => ({
    labels: ['Empty', 'Half Full', 'Full'],
    datasets: [
      {
        data: [12, 8, 4],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(220, 53, 69, 0.8)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)'
        ],
        borderWidth: 1
      }
    ]
  }), []);

  const monthlyTrendData = useMemo(() => ({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Waste Collected (tons)',
        data: [4, 5, 8, 5, 8, 6, 5, 7, 6, 2, 5, 7],
        borderColor: 'rgba(74, 100, 145, 1)',
        backgroundColor: 'rgba(74, 100, 145, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }), []);

  const complaintResolutionData = useMemo(() => ({
    labels: ['Resolved', 'In Progress', 'Pending'],
    datasets: [
      {
        data: [stats.resolvedComplaints, complaints.filter(c => c.status === 'in-progress').length, stats.pendingComplaints],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(220, 53, 69, 0.8)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)'
        ],
        borderWidth: 1
      }
    ]
  }), [stats.resolvedComplaints, stats.pendingComplaints, complaints]);

  const workerPerformanceData = useMemo(() => ({
    labels: workers.slice(0, 6).map(worker => worker.name?.split(' ')[0] + '.' || 'Worker'),
    datasets: [
      {
        label: 'Collections Completed',
        data: workers.slice(0, 6).map(() => Math.floor(Math.random() * 50) + 30),
        backgroundColor: 'rgba(74, 100, 145, 0.8)',
        borderColor: 'rgba(74, 100, 145, 1)',
        borderWidth: 1
      }
    ]
  }), [workers]);

  // Load data on component mount with proper cleanup
  useEffect(() => {
    setIsMounted(true);

    const initializeData = async () => {
      await fetchData();
      await loadAdminProfile();
      await loadSchedules(); // NEW: Load schedules
    };

    initializeData();

    // Set up interval for live stream updates
    const interval = setInterval(() => {
      if (isMounted) {
        setActiveLiveStreams(prev => 
          prev.map(stream => ({
            ...stream,
            bins_collected: stream.bins_collected ? stream.bins_collected + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 10),
            last_updated: new Date().toISOString()
          }))
        );
      }
    }, 30000);
    
    return () => {
      setIsMounted(false);
      clearInterval(interval);
    };
  }, [fetchData, loadAdminProfile, loadSchedules, isMounted]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { position: 'top' }
    },
    maintainAspectRatio: false
  }), []);

  const lineChartOptions = useMemo(() => ({
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Tons Collected' }
      }
    }
  }), [chartOptions]);

  // Single definition of utility functions
  const formatDuration = useCallback((startTime) => {
    if (!startTime) return '0m';
    const diff = new Date() - new Date(startTime);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }, []);

  const getStatusClass = useCallback((status) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'in-progress': return 'status-in-progress';
      case 'resolved': return 'status-resolved';
      case 'empty': return 'status-empty';
      case 'half-full': return 'status-half-full';
      case 'full': return 'status-full';
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      default: return 'status-pending';
    }
  }, []);

  const getPriorityClass = useCallback((priority) => {
    switch (priority) {
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  }, []);

  const refreshData = useCallback(() => {
    if (!isMounted) return;
    setLoading(true);
    fetchData();
    loadSchedules(); // NEW: Refresh schedules
  }, [fetchData, loadSchedules, isMounted]);

  const handleAddBin = useCallback(async () => {
    if (!newBin.location) {
      alert('Please enter a location for the new bin');
      return;
    }
    try {
      const response = await apiCall('/admin/bins', {
        method: 'POST',
        body: JSON.stringify(newBin)
      });
      if (response.success && isMounted) {
        setShowAddBinModal(false);
        setNewBin({ location: '', status: 'empty', capacity: '100L' });
        fetchData();
        alert('New bin added successfully!');
      }
    } catch (error) {
      console.error('Error adding bin:', error);
      alert('Failed to add bin. Please try again.');
    }
  }, [newBin, apiCall, fetchData, isMounted]);

  const handleDeleteBin = useCallback(async (binId) => {
    if (window.confirm('Are you sure you want to delete this bin?')) {
      try {
        await apiCall(`/admin/bins/${binId}`, {
          method: 'DELETE'
        });
        if (isMounted) {
          fetchData();
          alert('Bin deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting bin:', error);
        alert('Failed to delete bin. Please try again.');
      }
    }
  }, [apiCall, fetchData, isMounted]);

  const handleAddWorker = useCallback(async () => {
    if (!newWorker.name || !newWorker.email) {
      alert('Please fill in all required fields');
      return;
    }
    try {
      const response = await apiCall('/admin/workers', {
        method: 'POST',
        body: JSON.stringify(newWorker)
      });
      if (response.success && isMounted) {
        setShowAddWorkerModal(false);
        setNewWorker({ name: '', role: 'driver', email: '', phone: '' });
        fetchData();
        alert('New worker added successfully!');
      }
    } catch (error) {
      console.error('Error adding worker:', error);
      alert('Failed to add worker. Please try again.');
    }
  }, [newWorker, apiCall, fetchData, isMounted]);

  const handleDeleteWorker = useCallback(async (workerId) => {
    if (window.confirm('Are you sure you want to delete this worker?')) {
      try {
        await apiCall(`/admin/workers/${workerId}`, {
          method: 'DELETE'
        });
        if (isMounted) {
          fetchData();
          alert('Worker deleted successfully!');
        }
      } catch (error) {
        console.error('Error deleting worker:', error);
        alert('Failed to delete worker. Please try again.');
      }
    }
  }, [apiCall, fetchData, isMounted]);

 const handleUpdateComplaintStatus = useCallback(async (complaintId, newStatus) => {
  try {
    let endpoint;
    
    // Use the correct specialized endpoints
    if (newStatus === 'resolved') {
      endpoint = `/admin/complaints/${complaintId}/resolve`;
    } else {
      endpoint = `/admin/complaints/${complaintId}/status`;
    }

    const body = newStatus === 'resolved' 
      ? {} // No body needed for resolve endpoint
      : { status: newStatus };

    await apiCall(endpoint, {
      method: 'PATCH',
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined
    });
    
    if (isMounted) {
      fetchData();
      alert(`Complaint status updated to ${newStatus.replace('-', ' ')}!`);
    }
  } catch (error) {
    console.error('Error updating complaint:', error);
    
    // Fallback: Update locally if API fails
    if (isMounted) {
      setComplaints(prev => prev.map(complaint => 
        complaint.id === complaintId 
          ? { ...complaint, status: newStatus }
          : complaint
      ));
      alert(`Complaint status updated to ${newStatus.replace('-', ' ')}! (Local update)`);
    }
  }
}, [apiCall, fetchData, isMounted]);
 const handleAssignComplaint = useCallback(async (complaintId, workerId) => {
  try {
    await apiCall(`/admin/complaints/${complaintId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ workerId })
    });
    
    if (isMounted) {
      fetchData();
      const worker = workers.find(w => w.id === workerId);
      alert(`Complaint assigned to ${worker?.name || 'worker'} successfully!`);
    }
  } catch (error) {
    console.error('Error assigning complaint:', error);
    alert('Failed to assign complaint. Please try again.');
  }
}, [apiCall, fetchData, isMounted, workers]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  }, []);

  // NEW: Close schedule modal
  const closeAddScheduleModal = useCallback(() => {
    setShowAddScheduleModal(false);
    setNewSchedule({
      area: '',
      day: 'Monday',
      time: '08:00',
      frequency: 'weekly',
      assigned_driver: '',
      status: 'active'
    });
  }, []);

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div className="header-content">
          <div className="header-title">
            <div className="logo-section">
              <i className="fas fa-recycle logo-icon"></i>
              <div>
                <h1>
                  <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    WasteWise
                  </a>
                </h1>
                <p className="header-title">Admin Dashboard</p>
                <p className="header-subtitle">Monitor and manage waste collection operations</p>
              </div>
            </div>
          </div>
          <div className="admin-actions">
            <button className="btn btn-icon" onClick={refreshData} title="Refresh Data">
              <i className="fas fa-sync-alt"></i>
            </button>
            
            {activeLiveStreams.length > 0 && (
              <div className="live-indicator">
                <span className="live-dot"></span>
                <span>{activeLiveStreams.length} Live</span>
              </div>
            )}
            
            <div className="notifications-wrapper">
              <button className="btn btn-icon" onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
                <i className="fas fa-bell"></i>
                {notifications.filter(n => !n.read_status).length > 0 && (
                  <span className="notification-badge">{notifications.filter(n => !n.read_status).length}</span>
                )}
              </button>
              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h3>Notifications</h3>
                    <button className="btn btn-sm btn-primary" onClick={() => setNotifications(notifications.map(n => ({ ...n, read_status: true })))}>
                      Mark All as Read
                    </button>
                  </div>
                  <div className="notification-tabs">
                    <button className="notification-tab active">All</button>
                    <button className="notification-tab">Live</button>
                  </div>
                  <div className="notifications-list">
                    {notifications.map(n => (
                      <div key={`notification-${n.id}`} className={`notification-item ${n.read_status ? 'read' : ''} ${n.type}`}>
                        <div className="notification-content">
                          <div className="notification-header">
                            <strong>{n.title}</strong>
                            {n.type === 'live-video' && <span className="live-badge">LIVE</span>}
                          </div>
                          <p>{n.message}</p>
                          <span className="notification-time">{new Date(n.created_at).toLocaleTimeString()}</span>
                          {n.type === 'live-video' && (
                            <div className="live-notification-actions">
                              <button onClick={() => watchLiveVideo(n)}>
                                <i className="fas fa-video"></i> Watch Live
                              </button>
                            </div>
                          )}
                        </div>
                        {!n.read_status && (
                          <button className="mark-read-btn" onClick={() => setNotifications(notifications.map(notif => notif.id === n.id ? { ...notif, read_status: true } : notif))} title="Mark as Read">
                            <i className="fas fa-check"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="no-notifications">
                        <p>No notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="btn btn-profile" onClick={() => setShowAdminProfile(true)}>
              <div className="profile-avatar">
                <i className="fas fa-user"></i>
              </div>
              <span>{adminProfile.name}</span>
            </button>
            <button className="btn btn-logout" onClick={handleLogout} title="Logout">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Admin Profile Modal */}
      {showAdminProfile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Admin Profile</h3>
              <button className="modal-close" onClick={() => setShowAdminProfile(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-info">
                <div className="profile-field"><label>Name</label><span>{adminProfile.name}</span></div>
                <div className="profile-field"><label>Email</label><span>{adminProfile.email}</span></div>
                <div className="profile-field"><label>Role</label><span>{adminProfile.role}</span></div>
                <div className="profile-field"><label>Department</label><span>{adminProfile.department}</span></div>
                <div className="profile-field"><label>Phone</label><span>{adminProfile.phone}</span></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowAdminProfile(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Bin Modal */}
      {showAddBinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Bin</h3>
              <button className="modal-close" onClick={() => setShowAddBinModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={newBin.location || ''}
                  onChange={(e) => setNewBin({ ...newBin, location: e.target.value })}
                  placeholder="Enter bin location"
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={newBin.status || 'empty'} onChange={(e) => setNewBin({ ...newBin, status: e.target.value })}>
                  <option value="empty">Empty</option>
                  <option value="half-full">Half Full</option>
                  <option value="full">Full</option>
                </select>
              </div>
              <div className="form-group">
                <label>Capacity</label>
                <input
                  type="text"
                  value={newBin.capacity || ''}
                  onChange={(e) => setNewBin({ ...newBin, capacity: e.target.value })}
                  placeholder="e.g., 100L"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddBinModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddBin}>
                Add Bin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Worker</h3>
              <button className="modal-close" onClick={() => setShowAddWorkerModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  value={newWorker.name || ''}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  placeholder="Enter worker's full name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={newWorker.role || 'driver'} onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}>
                  <option value="driver">Driver</option>
                </select>
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  value={newWorker.email || ''}
                  onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={newWorker.phone || ''}
                  onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddWorkerModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddWorker}>
                Add Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Add Schedule Modal */}
      {showAddScheduleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New Collection Schedule</h3>
              <button className="modal-close" onClick={closeAddScheduleModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Area *</label>
                <input
                  type="text"
                  value={newSchedule.area || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, area: e.target.value })}
                  placeholder="Enter collection area"
                  required
                />
              </div>
              <div className="form-group">
                <label>Day</label>
                <select value={newSchedule.day || 'Monday'} onChange={(e) => setNewSchedule({ ...newSchedule, day: e.target.value })}>
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                  <option value="Saturday">Saturday</option>
                  <option value="Sunday">Sunday</option>
                </select>
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  value={newSchedule.time || '08:00'}
                  onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <select value={newSchedule.frequency || 'weekly'} onChange={(e) => setNewSchedule({ ...newSchedule, frequency: e.target.value })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Assigned Driver *</label>
                <input
                  type="text"
                  value={newSchedule.assigned_driver || ''}
                  onChange={(e) => setNewSchedule({ ...newSchedule, assigned_driver: e.target.value })}
                  placeholder="Enter driver name"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeAddScheduleModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSchedule}>
                Add Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Video Modal  */}
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

      {/* Track Route Modal -  */}
      {showTrackRouteModal && (
        <div className="modal-overlay" onClick={closeTrackRouteModal}>
          <div className="modal-content track-route-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-map-marker-alt"></i> Track Route: {selectedStreamForRoute?.location}
              </h3>
              <button className="modal-close" onClick={closeTrackRouteModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="map-container">
                <iframe
                  src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(selectedStreamForRoute?.location || '')}`}
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Route Tracking Map"
                ></iframe>
                <div className="map-info">
                  <p><strong>Current Location:</strong> {selectedStreamForRoute?.location}</p>
                  <p><strong>Driver:</strong> {selectedStreamForRoute?.driver_name || 'Unknown'}</p>
                  <p><strong>Vehicle:</strong> {selectedStreamForRoute?.vehicle_info || 'Unknown'}</p>
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

      {/* Main Navigation */}
      <nav className="admin-nav">
        <button 
          className={activeTab === 'dashboard' ? 'nav-btn active' : 'nav-btn'} 
          onClick={() => setActiveTab('dashboard')}
        >
          <i className="fas fa-tachometer-alt"></i> Dashboard
        </button>
        <button 
          className={activeTab === 'reports' ? 'nav-btn active' : 'nav-btn'} 
          onClick={() => setActiveTab('reports')}
        >
          <i className="fas fa-chart-bar"></i> Reports & Analytics
        </button>
        <button 
          className={activeTab === 'management' ? 'nav-btn active' : 'nav-btn'} 
          onClick={() => setActiveTab('management')}
        >
          <i className="fas fa-cog"></i> Management
        </button>
        <button 
          className={activeTab === 'live' ? 'nav-btn active' : 'nav-btn'} 
          onClick={() => setActiveTab('live')}
        >
          <i className="fas fa-video"></i> Live Monitoring
        </button>
        {/* NEW: Schedules Tab */}
        <button 
          className={activeTab === 'schedules' ? 'nav-btn active' : 'nav-btn'} 
          onClick={() => setActiveTab('schedules')}
        >
          <i className="fas fa-calendar-alt"></i> Collection Schedules
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="admin-content">
        {/* Live Monitoring Tab */}
        {activeTab === 'live' && (
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
                        onAlert={handleAlertDriver}
                      />
                    ))}
                  </div>

                  {activeLiveStreams.length === 0 && (
                    <div className="no-live-streams">
                      <i className="fas fa-video-slash"></i>
                      <h3>No Active Live Streams</h3>
                      <p>There are currently no active collection streams in your area.</p>
                      <button className="btn-primary" onClick={refreshLiveStreams}>
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
                              <span className="stat-value">{formatDuration(driver.start_time)}</span>
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
                              <i className="fas fa-map-marker-alt"></i> Track Route
                            </button>
                          <button 
                            className="btn-info"
                            onClick={() => handleAlertDriver(driver)}
                          >
                            <i className="fas fa-info-circle"></i> Alert
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="live-controls">
              <h3>Live Control Center</h3>
              <div className="control-grid">
                <div className="control-card">
                  <h4>Emergency Broadcast</h4>
                  <p>Send emergency alerts to all active drivers</p>
                  <button className="btn btn-alert" onClick={() => alert('Emergency broadcast sent to all active drivers')}>
                    <i className="fas fa-broadcast-tower"></i> Broadcast Alert
                  </button>
                </div>
                <div className="control-card">
                  <h4>Route Optimization</h4>
                  <p>Optimize collection routes in real-time</p>
                  <button className="btn btn-primary" onClick={() => alert('Route optimization initiated for all active collections')}>
                    <i className="fas fa-route"></i> Optimize Routes
                  </button>
                </div>
                <div className="control-card">
                  <h4>System Health</h4>
                  <p>Monitor system performance and connectivity</p>
                  <div className="health-status">
                    <span className="status-badge status-active">All Systems Operational</span>
                    <span className="health-metric">Live Streams: {activeLiveStreams.length}</span>
                    <span className="health-metric">Uptime: 99.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-tab">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-trash-alt"></i></div>
                <div className="stat-info">
                  <h3>{stats.totalBins}</h3>
                  <p>Total Bins</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-truck"></i></div>
                <div className="stat-info">
                  <h3>{stats.totalTrucks}</h3>
                  <p>Collection Trucks</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-exclamation-circle"></i></div>
                <div className="stat-info">
                  <h3>{stats.pendingComplaints}</h3>
                  <p>Pending Complaints</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-check-circle"></i></div>
                <div className="stat-info">
                  <h3>{stats.resolvedComplaints}</h3>
                  <p>Resolved Complaints</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-users"></i></div>
                <div className="stat-info">
                  <h3>{stats.totalWorkers}</h3>
                  <p>Total Workers</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><i className="fas fa-chart-line"></i></div>
                <div className="stat-info">
                  <h3>{stats.collectionRate}%</h3>
                  <p>Collection Rate</p>
                </div>
              </div>
            </div>

            <div className="charts-grid">
              <div className="chart-card">
                <h3>Weekly Collection</h3>
                <div className="chart-container">
                  <Bar data={weeklyData} options={chartOptions} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Bin Status Distribution</h3>
                <div className="chart-container">
                  <Doughnut data={binStatusData} options={chartOptions} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Monthly Collection Trend</h3>
                <div className="chart-container">
                  <Line data={monthlyTrendData} options={lineChartOptions} />
                </div>
              </div>
              <div className="chart-card">
                <h3>Complaint Resolution</h3>
                <div className="chart-container">
                  <Pie data={complaintResolutionData} options={chartOptions} />
                </div>
              </div>
            </div>

            <div className="activity-section">
              <div className="recent-activity">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {auditLogs.slice(0, 5).map(log => (
                    <div key={`activity-${log.id}`} className="activity-item">
                      <div className="activity-icon">
                        <i className="fas fa-history"></i>
                      </div>
                      <div className="activity-content">
                        <p><strong>{log.user_name}</strong> {log.action}</p>
                        <span className="activity-time">{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="worker-performance">
                <h3>Top Performers</h3>
                <div className="chart-container">
                  <Bar data={workerPerformanceData} options={chartOptions} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="reports-tab">
            <div className="reports-header">
              <h2>Reports & Analytics</h2>
              <div className="reports-actions">
                <button className="btn btn-primary" onClick={handleGenerateNewReport}>
                  <i className="fas fa-plus"></i> Generate New Report
                </button>
                <div className="export-options">
                  <button className="btn btn-secondary" onClick={() => exportReport('PDF')}>
                    <i className="fas fa-file-pdf"></i> Export All PDF
                  </button>
                  <button className="btn btn-secondary" onClick={() => exportReport('CSV')}>
                    <i className="fas fa-file-csv"></i> Export All CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="reports-grid">
              {reports.map(report => (
                <div key={`report-${report.id}`} className="report-card">
                  <div className="report-header">
                    <div className="report-icon">
                      <i className={`fas fa-file-${report.type?.toLowerCase() === 'pdf' ? 'pdf' : 'excel'}`}></i>
                    </div>
                    <div className="report-actions">
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => handleDownloadIndividualReport(report.id, report.name || 'Unnamed_Report', 'pdf')}
                        title="Download PDF Report"
                      >
                        <i className="fas fa-download"></i> PDF
                      </button>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => handleDownloadIndividualReport(report.id, report.name || 'Unnamed_Report', 'excel')}
                        title="Download Excel Report"
                      >
                        <i className="fas fa-download"></i> Excel
                      </button>
                    </div>
                  </div>
                  <div className="report-content">
                    <h4>{report.name || 'Unnamed Report'}</h4>
                    <p className="report-description">
                      Comprehensive report including system overview, complaints summary, worker performance, and analytics.
                    </p>
                    <div className="report-meta">
                      <span><i className="fas fa-calendar"></i> {new Date(report.created_at).toLocaleDateString()}</span>
                      <span><i className="fas fa-download"></i> {report.downloads || 0} downloads</span>
                      <span><i className="fas fa-user"></i> {report.generated_by_name || 'System'}</span>
                    </div>
                    <div className="report-features">
                      <span className="feature-tag">System Overview</span>
                      <span className="feature-tag">Worker Performance</span>
                      <span className="feature-tag">Complaints Analysis</span>
                      <span className="feature-tag">Bin Status</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {reports.length === 0 && (
              <div className="no-reports">
                <i className="fas fa-file-alt"></i>
                <h3>No Reports Available</h3>
                <p>Generate your first report to see analytics and insights.</p>
                <button className="btn btn-primary" onClick={handleGenerateNewReport}>
                  Generate First Report
                </button>
              </div>
            )}

            <div className="analytics-section">
              <h3>Advanced Analytics</h3>
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h4>Collection Efficiency</h4>
                  <div className="chart-container">
                    <Line data={monthlyTrendData} options={lineChartOptions} />
                  </div>
                </div>
                <div className="analytics-card">
                  <h4>Worker Performance</h4>
                  <div className="chart-container">
                    <Bar data={workerPerformanceData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Management Tab */}
        {activeTab === 'management' && (
          <div className="management-tab">
            <div className="management-header">
              <h2>System Management</h2>
              <div className="management-tabs">
                <button 
                  className={activeManagementTab === 'bins' ? 'tab-btn active' : 'tab-btn'} 
                  onClick={() => setActiveManagementTab('bins')}
                >
                  <i className="fas fa-trash-alt"></i> Bins Management
                </button>
                <button 
                  className={activeManagementTab === 'workers' ? 'tab-btn active' : 'tab-btn'} 
                  onClick={() => setActiveManagementTab('workers')}
                >
                  <i className="fas fa-users"></i> Workers Management
                </button>
                <button 
                  className={activeManagementTab === 'complaints' ? 'tab-btn active' : 'tab-btn'} 
                  onClick={() => setActiveManagementTab('complaints')}
                >
                  <i className="fas fa-exclamation-circle"></i> Complaints
                </button>
                <button 
                  className={activeManagementTab === 'audit' ? 'tab-btn active' : 'tab-btn'} 
                  onClick={() => setActiveManagementTab('audit')}
                >
                  <i className="fas fa-clipboard-list"></i> Audit Logs
                </button>
              </div>
            </div>

            {/* Bins Management */}
            {activeManagementTab === 'bins' && (
              <div className="management-section">
                <div className="section-header">
                  <h3>Bins Management</h3>
                  <button className="btn btn-primary" onClick={() => setShowAddBinModal(true)}>
                    <i className="fas fa-plus"></i> Add New Bin
                  </button>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Location</th>
                        <th>Status</th>
                        <th>Capacity</th>
                        <th>Last Collected</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bins.map(bin => (
                        <tr key={`bin-${bin.id}`}>
                          <td>BIN-{bin.id}</td>
                          <td>{bin.location}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(bin.status)}`}>
                              {bin.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{bin.capacity}</td>
                          <td>{bin.last_collected ? new Date(bin.last_collected).toLocaleDateString() : 'Never'}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn-icon" title="View Details" onClick={() => alert(`Bin Details:\nLocation: ${bin.location}\nStatus: ${bin.status}\nCapacity: ${bin.capacity}`)}>
                                <i className="fas fa-eye"></i>
                              </button>
                              <button className="btn btn-icon btn-danger" title="Delete" onClick={() => handleDeleteBin(bin.id)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Workers Management */}
            {activeManagementTab === 'workers' && (
              <div className="management-section">
                <div className="section-header">
                  <h3>Workers Management</h3>
                  <button className="btn btn-primary" onClick={() => setShowAddWorkerModal(true)}>
                    <i className="fas fa-plus"></i> Add New Worker
                  </button>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th>Assigned Tasks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workers.map(worker => {
                        const assignedComplaints = complaints.filter(c => 
                          c.assigned_to === worker.id || c.assigned_to_name === worker.name
                        );
                        const activeTasks = assignedComplaints.filter(c => c.status === 'in-progress');
                        
                        return (
                          <tr key={`worker-${worker.id}`}>
                            <td>WRK-{worker.id}</td>
                            <td>{worker.name}</td>
                            <td>
                              <span className={`role-badge role-${worker.role}`}>
                                {worker.role.toUpperCase()}
                              </span>
                            </td>
                            <td>{worker.email}</td>
                            <td>{worker.phone}</td>
                            <td>
                              <span className={`status-badge ${getStatusClass(worker.status)}`}>
                                {worker.status ? worker.status.toUpperCase() : 'ACTIVE'}
                              </span>
                            </td>
                            <td>
                              <span className={`task-count ${activeTasks.length > 0 ? 'has-tasks' : ''}`}>
                                {assignedComplaints.length} total ({activeTasks.length} active)
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn btn-icon" title="View Details" onClick={() => alert(`Worker Details:\nName: ${worker.name}\nRole: ${worker.role}\nEmail: ${worker.email}\nPhone: ${worker.phone}`)}>
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button 
                                  className="btn btn-icon btn-danger" 
                                  title="Delete" 
                                  onClick={() => handleDeleteWorker(worker.id)}
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Complaints Management */}
            {activeManagementTab === 'complaints' && (
              <div className="management-section">
                <div className="section-header">
                  <h3>Complaints Management</h3>
                  <div className="complaint-stats">
                    <span className="stat-pending">Pending: {stats.pendingComplaints}</span>
                    <span className="stat-resolved">Resolved: {stats.resolvedComplaints}</span>
                  </div>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Description</th>
                        <th>Location</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Submitted</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map(complaint => (
                        <tr key={`complaint-${complaint.id}`}>
                          <td>CMP-{complaint.id}</td>
                          <td>{complaint.description}</td>
                          <td>{complaint.location}</td>
                          <td>
                            <span className={`priority-badge ${getPriorityClass(complaint.priority)}`}>
                              {complaint.priority.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusClass(complaint.status)}`}>
                              {complaint.status.replace('-', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>
                            {complaint.assigned_to_name ? (
                              <span className="assigned-worker">{complaint.assigned_to_name}</span>
                            ) : (
                              <span className="not-assigned">Not assigned</span>
                            )}
                          </td>
                          <td>{new Date(complaint.created_at).toLocaleDateString()}</td>
                                                   <td>
                            <div className="action-buttons">
                              {complaint.status === 'pending' && (
                                <select 
                                  className="assign-dropdown"
                                  onChange={(e) => {
                                    const workerId = e.target.value;
                                    if (workerId) {
                                      handleAssignComplaint(complaint.id, workerId);
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Assign to...</option>
                                  {workers.filter(w => w.role === 'driver' && w.status === 'active')
                                    .map(worker => (
                                      <option key={worker.id} value={worker.id}>
                                        {worker.name}
                                      </option>
                                    ))
                                  }
                                </select>
                              )}
                              {complaint.status === 'in-progress' && (
                                <button className="btn btn-success btn-sm" onClick={() => handleUpdateComplaintStatus(complaint.id, 'resolved')}>
                                  Resolve
                                </button>
                              )}
                              <button className="btn btn-icon" title="View Details" onClick={() => alert(`Complaint Details:\nDescription: ${complaint.description}\nLocation: ${complaint.location}\nPriority: ${complaint.priority}\nStatus: ${complaint.status}`)}>
                                <i className="fas fa-eye"></i>
                              </button>
                            </div>
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Audit Logs Management */}
            {activeManagementTab === 'audit' && (
              <div className="management-section">
                <div className="section-header">
                  <h3>Audit Logs</h3>
                  <div className="audit-stats">
                    <span>Total Logs: {auditLogs.length}</span>
                  </div>
                </div>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Type</th>
                        <th>Timestamp</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={`audit-${log.id}`}>
                          <td>AUD-{log.id}</td>
                          <td>{log.user_name}</td>
                          <td>{log.action}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(log.type)}`}>
                              {log.type.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn btn-icon" title="View Details" onClick={() => alert(`Audit Log Details:\nUser: ${log.user_name}\nAction: ${log.action}\nType: ${log.type}\nTime: ${new Date(log.created_at).toLocaleString()}`)}>
                                <i className="fas fa-eye"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW: Collection Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="management-tab">
            <div className="management-header">
              <h2>Collection Schedules</h2>
              <div className="management-tabs">
                <button className="tab-btn active">
                  <i className="fas fa-calendar-alt"></i> All Schedules
                </button>
              </div>
            </div>

            <div className="management-section">
              <div className="section-header">
                <h3>Regular Collection Schedules</h3>
                <button className="btn btn-primary" onClick={() => setShowAddScheduleModal(true)}>
                  <i className="fas fa-plus"></i> Add New Schedule
                </button>
              </div>

              <div className="schedules-grid">
                {schedules.map(schedule => (
                  <div key={`schedule-${schedule.id}`} className="schedule-card">
                    <div className="schedule-header">
                      <h4>{schedule.area}</h4>
                      <span className={`status-badge ${getStatusClass(schedule.status)}`}>
                        {schedule.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="schedule-info">
                      <div className="info-item">
                        <label>Day:</label>
                        <span>{schedule.day}</span>
                      </div>
                      <div className="info-item">
                        <label>Time:</label>
                        <span>{schedule.time}</span>
                      </div>
                      <div className="info-item">
                        <label>Frequency:</label>
                        <span>{schedule.frequency}</span>
                      </div>
                      <div className="info-item">
                        <label>Assigned Driver:</label>
                        <span>{schedule.assigned_driver}</span>
                      </div>
                      <div className="info-item">
                        <label>Created:</label>
                        <span>{new Date(schedule.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="schedule-actions">
                      <button 
                        className={`btn btn-sm ${schedule.status === 'active' ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => handleToggleScheduleStatus(schedule.id)}
                      >
                        <i className={`fas fa-${schedule.status === 'active' ? 'pause' : 'play'}`}></i>
                        {schedule.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                      >
                        <i className="fas fa-trash"></i> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {schedules.length === 0 && (
                <div className="no-schedules">
                  <i className="fas fa-calendar-alt"></i>
                  <h3>No Collection Schedules</h3>
                  <p>Add collection schedules to help citizens and drivers know when garbage collection occurs.</p>
                  <button className="btn btn-primary" onClick={() => setShowAddScheduleModal(true)}>
                    Add First Schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;