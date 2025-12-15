import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WasteImage from "./image/Waste.JPG";
import AppImage from "./image/App.JPG";
import SmartImage from "./image/Smart.JPG";
import './Home.css';

const Home = () => {
  const [feedbackForm, setFeedbackForm] = useState({
    name: '',
    email: '',
    rating: 5,
    comments: '',
    category: 'general_feedback' // Changed to match backend
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const navigate = useNavigate();

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm({
      ...feedbackForm,
      [name]: value
    });
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSubmitStatus('success');
        setFeedbackForm({
          name: '',
          email: '',
          rating: 5,
          comments: '',
          category: 'general_feedback' // Reset to match backend
        });
        // Auto-close form after successful submission
        setTimeout(() => {
          setShowFeedbackForm(false);
        }, 2000);
      } else {
        throw new Error(data.message || 'Submission failed');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fixed navigation handlers
  const handleGetStarted = () => {
    navigate('/register');
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  // Toggle feedback form
  const toggleFeedbackForm = () => {
    setShowFeedbackForm(!showFeedbackForm);
  };

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="home-nav">
        <div className="nav-container">
          <div className="logo">
            <i className="fas fa-recycle"></i>
            <span>WasteWise</span>
          </div>
          <div className="nav-links">
            <Link to="/auth" className="nav-link btn-nav">Login</Link>
            <Link to="/register" className="nav-link btn-nav">Register</Link>
            <Link to="/auth" className="nav-link btn-nav">Citizen</Link>
            <Link to="/auth" className="nav-link btn-nav">Admin</Link>
            <Link to="/auth" className="nav-link btn-nav">Driver</Link>
            <Link to="/gallery" className="nav-link btn-nav">Photos</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1>Revolutionizing Urban <span className="highlight">Waste Management</span></h1>
            <p>An efficient, transparent, and citizen-friendly platform that transforms how cities handle waste through innovative technology and data-driven insights.</p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary">Get Started Free</Link>
              <Link to="/auth" className="btn btn-secondary">Sign In</Link>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <h3>50+</h3>
                <p>Cities Served</p>
              </div>
              <div className="stat">
                <h3>10K+</h3>
                <p>Active Users</p>
              </div>
              <div className="stat">
                <h3>95%</h3>
                <p>Collection Efficiency</p>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <img src={WasteImage} alt="Smart Waste Management" />
            <img src={AppImage} alt="Smart Waste Management" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <div className="section-header">
            <h2>Smart Features for Smarter Cities</h2>
            <p>Discover how WasteWise transforms urban waste management with cutting-edge technology</p>
             <img src={SmartImage} alt="Smart Waste Management" />
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h3>Real-time Tracking</h3>
              <p>Monitor bin statuses and truck locations in real-time using interactive GPS-integrated maps for optimal oversight.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-comments"></i>
              </div>
              <h3>Complaint Management</h3>
              <p>Submit, track, and resolve complaints seamlessly with full transparency, status updates, and audit trails.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-chart-line"></i>
              </div>
              <h3>Advanced Analytics</h3>
              <p>Access comprehensive reports, data visualizations, and performance metrics to drive informed decision-making.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-route"></i>
              </div>
              <h3>Route Optimization</h3>
              <p>Intelligent route planning for waste collection teams, reducing fuel consumption and improving efficiency.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-database"></i>
              </div>
              <h3>Centralized Database</h3>
              <p>Fully normalized database ensuring data integrity, reduced redundancy, and reliable information management.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <i className="fas fa-mobile-alt"></i>
              </div>
              <h3>Mobile Responsive</h3>
              <p>Access the system from any device with our fully responsive design that works seamlessly across platforms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>How WasteWise Works</h2>
            <p>A simple, efficient process for better waste management</p>
          </div>
          <div className="process-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Sign Up & Access</h3>
                <p>Register for an account based on your role - citizen, driver, or administrator</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Monitor & Report</h3>
                <p>Track waste collection, report issues, and stay informed about your area</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Manage Efficiently</h3>
                <p>Administrators optimize routes while drivers follow smart collection schedules</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Analyze & Improve</h3>
                <p>Access comprehensive reports and analytics to continuously improve operations</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>What Our Users Say</h2>
            <p>Hear from cities and citizens who have transformed their waste management with WasteWise</p>
          </div>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"WasteWise has revolutionized how our city handles waste collection. The real-time tracking and analytics have improved our efficiency by 40%."</p>
              </div>
              <div className="testimonial-author">
                <h4>Sarah Johnson</h4>
                <p>City Sustainability Manager</p>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"As a driver, the route optimization feature has made my job so much easier. I complete my routes faster with less fuel consumption."</p>
              </div>
              <div className="testimonial-author">
                <h4>Michael Chen</h4>
                <p>Waste Collection Driver</p>
              </div>
            </div>
            <div className="testimonial-card">
              <div className="testimonial-content">
                <p>"I love being able to report issues and track their resolution. It makes me feel like an active participant in keeping our city clean."</p>
              </div>
              <div className="testimonial-author">
                <h4>Emma Rodriguez</h4>
                <p>Community Resident</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Transform Your Waste Management?</h2>
            <p>Join thousands of cities and citizens who are already benefiting from WasteWise</p>
            <div className="cta-buttons">
              <button onClick={handleGetStarted} className="btn btn-primary">Get Started Free</button>
              <button onClick={handleSignIn} className="btn btn-secondary">Sign In</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="logo">
                <i className="fas fa-recycle"></i>
                <span>WasteWise</span>
              </div>
              <p>Smart Waste Management and Tracking System</p>
              <div className="social-links">
                <a href="#"><i className="fab fa-facebook"></i></a>
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-linkedin"></i></a>
                <a href="#"><i className="fab fa-instagram"></i></a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/">Home</Link></li>
                <li><Link to="/auth">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
                <li><a href="#features">Features</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#">API</a></li>
                <li><a href="#">Help Center</a></li>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p><i className="fas fa-envelope"></i> info@wastewise.com</p>
              <p><i className="fas fa-phone"></i> +1 (555) 123-4567</p>
              <p><i className="fas fa-map-marker-alt"></i> 123 Eco Street, Green City, GC 12345</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 WasteWise. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Floating Feedback Button */}
      <div className="floating-feedback">
        <button 
          className="feedback-toggle-btn"
          onClick={toggleFeedbackForm}
        >
          <i className="fas fa-comment-dots"></i>
          <span>Feedback</span>
        </button>

        {showFeedbackForm && (
          <div className="feedback-popup">
            <div className="feedback-popup-header">
              <h3>Share Your Feedback</h3>
              <button 
                className="close-btn"
                onClick={toggleFeedbackForm}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="feedback-popup-content">
              <form className="feedback-form-popup" onSubmit={handleFeedbackSubmit}>
                <div className="form-group">
                  <label htmlFor="popup-name">Your Name</label>
                  <input
                    type="text"
                    id="popup-name"
                    name="name"
                    value={feedbackForm.name}
                    onChange={handleFeedbackChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="popup-email">Email Address</label>
                  <input
                    type="email"
                    id="popup-email"
                    name="email"
                    value={feedbackForm.email}
                    onChange={handleFeedbackChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="popup-category">Feedback Category</label>
                  <select
                    id="popup-category"
                    name="category"
                    value={feedbackForm.category}
                    onChange={handleFeedbackChange}
                  >
                    <option value="general_feedback">General Feedback</option>
                    <option value="suggestion">Suggestion</option>
                    <option value="complaint">Complaint</option>
                    <option value="technical_issue">Technical Issue</option>
                    <option value="praise">Praise</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Rating</label>
                  <div className="rating-input">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`rating-star ${feedbackForm.rating >= star ? 'active' : ''}`}
                        onClick={() => setFeedbackForm({...feedbackForm, rating: star})}
                      >
                        <i className="fas fa-star"></i>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="popup-comments">Your Feedback</label>
                  <textarea
                    id="popup-comments"
                    name="comments"
                    rows="4"
                    value={feedbackForm.comments}
                    onChange={handleFeedbackChange}
                    required
                    placeholder="Please share your thoughts, suggestions, or concerns..."
                  ></textarea>
                </div>
                
                {submitStatus === 'success' && (
                  <div className="form-message success">
                    <i className="fas fa-check-circle"></i>
                    Thank you for your feedback!
                  </div>
                )}
                
                {submitStatus === 'error' && (
                  <div className="form-message error">
                    <i className="fas fa-exclamation-circle"></i>
                    Error submitting feedback. Please try again.
                  </div>
                )}
                
                <button 
                  type="submit" 
                  className="btn btn-primary btn-block"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane"></i>
                      Submit Feedback
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;