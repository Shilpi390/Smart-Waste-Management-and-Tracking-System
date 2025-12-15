import React, { useState, useEffect } from 'react';
import './Gallery.css';

const Gallery = () => {
  const [activeTab, setActiveTab] = useState('complaints');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Real data states
  const [complaints, setComplaints] = useState([]);
  const [liveVideos, setLiveVideos] = useState([]);
  const [userFeedback, setUserFeedback] = useState([]);

  // API Base URL
  const API_BASE = 'http://localhost:5000/api';

  // Fetch data based on active tab
  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  const fetchData = async (tab) => {
    setLoading(true);
    setError(null);
    
    try {
      let endpoint = '';
      
      switch (tab) {
        case 'complaints':
          endpoint = '/public/complaints';
          break;
        case 'videos':
          endpoint = '/public/videos';
          break;
        case 'feedback':
          endpoint = '/public/feedback';
          break;
        default:
          return;
      }

      const response = await fetch(`${API_BASE}${endpoint}`);
      const result = await response.json();

      if (result.success) {
        switch (tab) {
          case 'complaints':
            setComplaints(result.data || []);
            break;
          case 'videos':
            setLiveVideos(result.data || []);
            break;
          case 'feedback':
            setUserFeedback(result.data || []);
            break;
        }
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error(`Error fetching ${tab}:`, err);
      setError(`Failed to load ${tab}. Please try again later.`);
      // Keep mock data as fallback
      setMockData(tab);
    } finally {
      setLoading(false);
    }
  };

  // Mock data fallback
  const setMockData = (tab) => {
    const mockComplaints = [
      {
        id: 1,
        description: "Severe waste on Main Street causing pollution. The condition has deteriorated significantly after recent rains.",
        location: "Devasandra lake, Block A, Sector 15",
        priority: "high",
        photos: ["/api/placeholder/400/300", "/api/placeholder/400/300"],
        status: "resolved",
        dateSubmitted: "2025-09-26",
        citizenName: "John Smith",
        citizenPhone: "+91-9876543210"
      }
    ];

    const mockVideos = [
      {
        id: 1,
        title: "Best Practices in Solid Waste Management - HSR Layout Bengaluru",
        location: "HSR Layout, Bengaluru",
        driverName: "BBMP Collection Team",
        vehicleNumber: "KA-05-HSR-001",
        streamUrl: "https://www.youtube.com/embed/PThI4w7RhYQ",
        thumbnail: "https://img.youtube.com/vi/PThI4w7RhYQ/maxresdefault.jpg",
        isLive: false,
        startTime: "2025-09-28T12:00:00Z",
        viewerCount: 12000,
        quality: "1080p",
        duration: "18m 38s",
        description: "Learn about effective waste segregation and collection practices from one of Bengaluru's best managed wards"
      }
    ];

    const mockFeedback = [
      {
        id: 1,
        name: "Rajesh Kumar",
        email: "rajesh.kumar@email.com",
        category: "praise",
        rating: 5,
        feedback: "Excellent app! The waste management videos are very informative and helped me understand proper segregation.",
        date: "2025-09-28",
        avatar: "/api/placeholder/50/50"
      }
    ];

    switch (tab) {
      case 'complaints':
        setComplaints(mockComplaints);
        break;
      case 'videos':
        setLiveVideos(mockVideos);
        break;
      case 'feedback':
        setUserFeedback(mockFeedback);
        break;
    }
  };

  // Navigation function
  const navigateToHome = () => {
    window.location.href = '/';
  };

  // Convert YouTube URL to embed format
  const getEmbedUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'complaints':
        return complaints;
      case 'videos':
        return liveVideos;
      case 'feedback':
        return userFeedback;
      default:
        return [];
    }
  };

  // Filter and search functionality
  const filteredData = getCurrentData().filter(item => {
    const matchesSearch = searchQuery === '' || 
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.feedback && item.feedback.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = filterBy === 'all' || 
      (item.status && item.status === filterBy) ||
      (item.priority && item.priority === filterBy) ||
      (item.category && item.category === filterBy) ||
      (filterBy === 'live' && item.isLive) ||
      (filterBy === 'recorded' && !item.isLive);

    return matchesSearch && matchesFilter;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.dateSubmitted || b.startTime || b.date) - 
               new Date(a.dateSubmitted || a.startTime || a.date);
      case 'oldest':
        return new Date(a.dateSubmitted || a.startTime || a.date) - 
               new Date(b.dateSubmitted || b.startTime || b.date);
      case 'priority':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      case 'views':
        return (b.viewerCount || 0) - (a.viewerCount || 0);
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      default:
        return 0;
    }
  });

  const getTabCount = (tab) => {
    switch (tab) {
      case 'complaints':
        return complaints.length;
      case 'videos':
        return liveVideos.length;
      case 'feedback':
        return userFeedback.length;
      default:
        return 0;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatViews = (views) => {
    if (views >= 1000000) {
      return (views / 1000000).toFixed(1) + 'M';
    } else if (views >= 1000) {
      return (views / 1000).toFixed(1) + 'K';
    }
    return views.toString();
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'priority high';
      case 'medium':
        return 'priority medium';
      case 'low':
        return 'priority low';
      default:
        return 'priority medium';
    }
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'pending': 'status-badge pending',
      'in-progress': 'status-badge in-progress',
      'resolved': 'status-badge resolved',
      'completed': 'status-badge completed'
    };
    return statusClasses[status] || 'status-badge pending';
  };

  const getCategoryBadge = (category) => {
    const categoryClasses = {
      'praise': 'category-badge praise',
      'suggestion': 'category-badge suggestion',
      'technical-issue': 'category-badge technical-issue',
      'complaint': 'category-badge complaint',
      'general': 'category-badge general'
    };
    return categoryClasses[category] || 'category-badge general';
  };

  const getCategoryIcon = (category) => {
    const categoryIcons = {
      'praise': 'fas fa-star',
      'suggestion': 'fas fa-lightbulb',
      'technical-issue': 'fas fa-bug',
      'complaint': 'fas fa-exclamation-triangle',
      'general': 'fas fa-comment'
    };
    return categoryIcons[category] || 'fas fa-comment';
  };

  const renderStars = (rating) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={`fas fa-star ${star <= rating ? 'active' : ''}`}
          ></i>
        ))}
      </div>
    );
  };

  // ========== MISSING RENDER FUNCTIONS ==========

  const renderComplaintCard = (complaint) => (
    <div key={complaint.id} className="content-card">
      <div className="card-media">
        <div className="status-badge-container">
          <span className={getStatusBadge(complaint.status)}>
            {complaint.status}
          </span>
        </div>
        <img 
          src={complaint.photos && complaint.photos[0] ? complaint.photos[0] : "/api/placeholder/400/300"} 
          alt="Complaint evidence"
          className="content-image"
        />
        {complaint.photos && complaint.photos.length > 1 && (
          <div className="photo-count-badge">
            <i className="fas fa-images"></i>
            {complaint.photos.length}
          </div>
        )}
      </div>
      
      <div className="card-content">
        <div className="content-meta">
          <div className="meta-item">
            <i className="fas fa-map-marker-alt"></i>
            {complaint.location || 'Unknown Location'}
          </div>
          <div className="meta-item">
            <i className="fas fa-calendar"></i>
            {formatDate(complaint.dateSubmitted)}
          </div>
          <div className="meta-item">
            <i className="fas fa-user"></i>
            {complaint.citizenName || 'Anonymous'}
          </div>
        </div>
        
        <p className="content-description">
          {complaint.description}
        </p>
        
        <div className="complaint-footer">
          <div className="priority-badge">
            <span className={getPriorityColor(complaint.priority)}>
              {complaint.priority} priority
            </span>
          </div>
        </div>
      </div>
      
      <div className="card-actions">
        <button 
          className="view-details-button"
          onClick={() => setSelectedItem(complaint)}
        >
          <i className="fas fa-eye"></i>
          View Details
        </button>
      </div>
    </div>
  );

  const renderVideoCard = (video) => (
    <div key={video.id} className="content-card">
      <div className="card-media">
        <img 
          src={video.thumbnail || "/api/placeholder/400/300"} 
          alt="Video thumbnail"
          className="content-image"
        />
        <div className="media-overlay">
          <div className="video-info">
            {video.isLive ? (
              <span className="live-badge">
                <i className="fas fa-circle"></i>
                LIVE
              </span>
            ) : (
              <span className="video-duration">{video.duration || 'N/A'}</span>
            )}
            <span className="video-quality">{video.quality || 'HD'}</span>
          </div>
          <button className="play-button">
            <i className="fas fa-play"></i>
          </button>
        </div>
        <div className="viewer-count">
          <i className="fas fa-eye"></i>
          {formatViews(video.viewerCount || 0)} views
        </div>
      </div>
      
      <div className="card-content">
        <h3 className="content-title">{video.title || 'Untitled Video'}</h3>
        
        <div className="content-meta">
          <div className="meta-item">
            <i className="fas fa-map-marker-alt"></i>
            {video.location || 'Unknown Location'}
          </div>
          <div className="meta-item">
            <i className="fas fa-user-circle"></i>
            {video.driverName || 'Unknown Driver'} {video.driverId && `(${video.driverId})`}
          </div>
          <div className="meta-item">
            <i className="fas fa-truck"></i>
            {video.vehicleNumber || 'Unknown Vehicle'}
          </div>
          <div className="meta-item">
            <i className="fas fa-clock"></i>
            {video.isLive ? 'Started' : 'Recorded'} {video.startTime ? formatTime(video.startTime) : 'Unknown time'}
          </div>
        </div>

        {video.description && (
          <p className="content-description">
            {video.description}
          </p>
        )}
      </div>
      
      <div className="card-actions">
        <button 
          className="view-details-button"
          onClick={() => setSelectedItem(video)}
        >
          <i className={video.isLive ? "fas fa-eye" : "fas fa-play"}></i>
          {video.isLive ? 'Watch Live' : 'Watch Video'}
        </button>
      </div>
    </div>
  );

 const renderFeedbackCard = (feedback) => (
  <div key={feedback.id} className="content-card feedback-card">
    <div className="feedback-header">
      <div className="user-info">
        {/* Remove avatar image and use icon instead */}
        <div className="user-avatar-placeholder">
          <i className="fas fa-user"></i>
        </div>
        <div className="user-details">
          <h4 className="user-name">{feedback.name || 'Anonymous User'}</h4>
          <p className="user-email">{feedback.email || 'No email provided'}</p>
        </div>
      </div>
      <div className="feedback-meta">
        <span className={getCategoryBadge(feedback.category)}>
          <i className={getCategoryIcon(feedback.category)}></i>
          {feedback.category ? feedback.category.replace('-', ' ') : 'general'}
        </span>
        <span className="feedback-date">{formatDate(feedback.date)}</span>
      </div>
    </div>

    <div className="card-content">
      <div className="rating-section">
        {renderStars(feedback.rating || 0)}
        <span className="rating-text">
          {feedback.rating === 5 ? 'Excellent' :
           feedback.rating === 4 ? 'Good' :
           feedback.rating === 3 ? 'Average' :
           feedback.rating === 2 ? 'Poor' : 'Very Poor'}
        </span>
      </div>
      
      <p className="feedback-text">
        {feedback.feedback}
      </p>
    </div>
  </div>
);
  const renderModal = () => {
    if (!selectedItem) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button 
            className="modal-close"
            onClick={() => setSelectedItem(null)}
          >
            <i className="fas fa-times"></i>
          </button>
          
          <div className="modal-header">
            <h2>{selectedItem.title || 'Complaint Details'}</h2>
            {selectedItem.status && (
              <span className={getStatusBadge(selectedItem.status)}>
                {selectedItem.status}
              </span>
            )}
          </div>
          
          <div className="modal-body">
            {activeTab === 'complaints' && (
              <>
                <div className="content-meta">
                  <div className="meta-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <strong>Location:</strong> {selectedItem.location}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-calendar"></i>
                    <strong>Submitted:</strong> {formatDate(selectedItem.dateSubmitted)}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-user"></i>
                    <strong>Citizen:</strong> {selectedItem.citizenName}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-phone"></i>
                    <strong>Contact:</strong> {selectedItem.citizenPhone}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-exclamation-triangle"></i>
                    <strong>Priority:</strong>
                    <span className={getPriorityColor(selectedItem.priority)}>
                      {selectedItem.priority}
                    </span>
                  </div>
                </div>

                <div className="complaint-description">
                  <h3>Description</h3>
                  <p>{selectedItem.description}</p>
                </div>

                <div className="media-display">
                  <h3>Evidence Photos ({selectedItem.photos ? selectedItem.photos.length : 0})</h3>
                  <div className="photos-grid">
                    {selectedItem.photos && selectedItem.photos.map((photo, index) => (
                      <img 
                        key={index}
                        src={photo} 
                        alt={`Evidence ${index + 1}`}
                        className="modal-image"
                      />
                    ))}
                  </div>
                </div>

                {selectedItem.status === 'resolved' && selectedItem.resolvedDate && (
                  <div className="resolution-section">
                    <h3>Resolution</h3>
                    <p>This complaint has been successfully resolved.</p>
                    <div className="resolution-date">
                      <i className="fas fa-check-circle"></i>
                      Resolved on {formatDate(selectedItem.resolvedDate)}
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'videos' && (
              <>
                <div className="content-meta">
                  <div className="meta-item">
                    <i className="fas fa-map-marker-alt"></i>
                    <strong>Location:</strong> {selectedItem.location}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-user-circle"></i>
                    <strong>Driver:</strong> {selectedItem.driverName} {selectedItem.driverId && `(${selectedItem.driverId})`}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-truck"></i>
                    <strong>Vehicle:</strong> {selectedItem.vehicleNumber}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-eye"></i>
                    <strong>Views:</strong> {formatViews(selectedItem.viewerCount)}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-hd-video"></i>
                    <strong>Quality:</strong> {selectedItem.quality}
                  </div>
                  <div className="meta-item">
                    <i className="fas fa-clock"></i>
                    <strong>Duration:</strong> {selectedItem.duration}
                  </div>
                </div>

                {selectedItem.description && (
                  <div className="video-description">
                    <h3>Description</h3>
                    <p>{selectedItem.description}</p>
                  </div>
                )}

                <div className="video-section">
                  <h3>{selectedItem.isLive ? 'Live Stream' : 'Video Recording'}</h3>
                  <div className="video-container">
                    <iframe 
                      src={getEmbedUrl(selectedItem.streamUrl)}
                      title={selectedItem.title}
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    ></iframe>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ========== MAIN COMPONENT RENDER ==========

  return (
    <div className="gallery-page">
      <header className="gallery-header">
        <div className="header-content">
          <div className="header-actions">
            <button className="home-button" onClick={navigateToHome}>
              <i className="fas fa-home"></i>
              Home
            </button>
            <button className="refresh-button" onClick={() => fetchData(activeTab)}>
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>
          
          <div className="header-text">
            <h1>WasteWise Public Gallery</h1>
            <p>View resolved complaints, waste collection videos, and user feedback</p>
          </div>

          <div className="tab-navigation">
            <button 
              className={`tab-btn ${activeTab === 'complaints' ? 'active' : ''}`}
              onClick={() => setActiveTab('complaints')}
            >
              <i className="fas fa-exclamation-triangle"></i>
              Resolved Complaints
              <span className="tab-count">{getTabCount('complaints')}</span>
            </button>
            
            <button 
              className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveTab('videos')}
            >
              <i className="fas fa-video"></i>
              Collection Videos
              <span className="tab-count">{getTabCount('videos')}</span>
            </button>

            <button 
              className={`tab-btn ${activeTab === 'feedback' ? 'active' : ''}`}
              onClick={() => setActiveTab('feedback')}
            >
              <i className="fas fa-comment-dots"></i>
              User Feedback
              <span className="tab-count">{getTabCount('feedback')}</span>
            </button>
          </div>

          <div className="search-filter-container">
            <div className="search-bar">
              <input
                type="text"
                className="search-input"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <i className="fas fa-search search-icon"></i>
            </div>

            <div className="filter-controls">
              <div className="filter-group">
                <label>Sort by:</label>
                <select 
                  className="filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  {activeTab === 'complaints' && <option value="priority">Priority</option>}
                  {activeTab === 'videos' && <option value="views">Most Viewed</option>}
                  {activeTab === 'feedback' && <option value="rating">Highest Rating</option>}
                </select>
              </div>

              {activeTab === 'complaints' && (
                <div className="filter-group">
                  <label>Status:</label>
                  <select 
                    className="filter-select"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="filter-group">
                  <label>Type:</label>
                  <select 
                    className="filter-select"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="all">All Videos</option>
                    <option value="live">Live Only</option>
                    <option value="recorded">Recorded</option>
                  </select>
                </div>
              )}

              {activeTab === 'feedback' && (
                <div className="filter-group">
                  <label>Category:</label>
                  <select 
                    className="filter-select"
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="praise">Praise</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="technical-issue">Technical Issue</option>
                    <option value="complaint">Complaint</option>
                    <option value="general">General</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="gallery-content">
        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading {activeTab}...</p>
          </div>
        )}

        {error && (
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={() => fetchData(activeTab)}>
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && sortedData.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-folder-open"></i>
            <h3>No {activeTab} found</h3>
            <p>Try adjusting your search or check back later for new content</p>
          </div>
        )}

        {!loading && !error && sortedData.length > 0 && (
          <>
            <div className="results-info">
              Showing {sortedData.length} of {getCurrentData().length} {activeTab}
              {activeTab === 'complaints' && ' ( complaints are shown publicly)'}
            </div>

            <div className="content-grid">
              {sortedData.map(item => {
                switch (activeTab) {
                  case 'complaints':
                    return renderComplaintCard(item);
                  case 'videos':
                    return renderVideoCard(item);
                  case 'feedback':
                    return renderFeedbackCard(item);
                  default:
                    return null;
                }
              })}
            </div>
          </>
        )}
      </main>

      {renderModal()}
    </div>
  );
};

export default Gallery;