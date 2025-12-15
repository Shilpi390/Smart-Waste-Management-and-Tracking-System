import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Auth.css';

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'citizen',
    resetToken: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate email format
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    // Validate email is not empty
    if (!formData.email.trim()) {
      setError('Email address is required.');
      setLoading(false);
      return;
    }

    try {
      console.log('Sending password reset request...', formData);
      
      // Make API call to request password reset
      const response = await authAPI.forgotPassword({
        email: formData.email.trim(),
        role: formData.role
      });
      
      console.log('Forgot Password API Response:', response);

      if (response.data) {
        const { success: apiSuccess, message, developmentInfo } = response.data;
        
        if (apiSuccess) {
          setSuccess(message || 'Password reset instructions have been sent to your email.');
          setEmailSent(true);
          
          // Show development info in console
          if (developmentInfo) {
            console.log('🔗 Reset Link:', developmentInfo.resetLink);
            console.log('💡 Development Note:', developmentInfo.message);
          }
        } else {
          setError(message || 'Failed to send reset instructions. Please try again.');
        }
      } else {
        setError('Invalid response from server. Please try again.');
      }
    } catch (err) {
      console.error('Forgot password error details:', err);
      
      // Enhanced error handling for backend responses
      if (err.message?.includes('backend server') || err.code === 'ECONNABORTED') {
        setError('Backend server is not running. Please make sure the server is started on http://localhost:5000');
      } else if (err.response?.data) {
        const backendError = err.response.data;
        setError(backendError.message || backendError.error || 'Failed to process your request');
      } else if (err.request) {
        setError('Cannot connect to server. Please check if the backend is running and try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate passwords
    if (!formData.newPassword.trim() || !formData.confirmPassword.trim()) {
      setError('Please fill in all password fields.');
      setLoading(false);
      return;
    }

    if (!validatePassword(formData.newPassword)) {
      setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match. Please make sure both passwords are identical.');
      setLoading(false);
      return;
    }

    if (!formData.resetToken.trim()) {
      setError('Reset token is required. Please enter the token from your email.');
      setLoading(false);
      return;
    }

    try {
      console.log('Resetting password with token...');
      
      // Make API call to reset password
      const response = await authAPI.resetPassword({
        token: formData.resetToken.trim(),
        newPassword: formData.newPassword.trim(),
        role: formData.role
      });
      
      console.log('Reset Password API Response:', response);

      if (response.data) {
        const { success: apiSuccess, message } = response.data;
        
        if (apiSuccess) {
          setSuccess(message || 'Your password has been reset successfully!');
          setPasswordReset(true);
          // Clear sensitive data
          setFormData(prev => ({
            ...prev,
            newPassword: '',
            confirmPassword: '',
            resetToken: ''
          }));
        } else {
          setError(message || 'Failed to reset password. The token may be invalid or expired.');
        }
      } else {
        setError('Invalid response from server. Please try again.');
      }
    } catch (err) {
      console.error('Reset password error details:', err);
      
      if (err.response?.data) {
        const backendError = err.response.data;
        setError(backendError.message || backendError.error || 'Failed to reset password');
      } else if (err.request) {
        setError('Cannot connect to server. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setEmailSent(false);
    setSuccess('');
    setError('');
    // Keep the form data filled for resend
  };

  const handleBackToLogin = () => {
    // Clear all states when going back to login
    setFormData({ email: '', role: 'citizen', resetToken: '', newPassword: '', confirmPassword: '' });
    setError('');
    setSuccess('');
    setEmailSent(false);
    setShowResetForm(false);
    setPasswordReset(false);
  };

  const handleResetAnother = () => {
    setPasswordReset(false);
    setEmailSent(false);
    setShowResetForm(false);
    setFormData({ email: '', role: 'citizen', resetToken: '', newPassword: '', confirmPassword: '' });
    setError('');
    setSuccess('');
  };

  const toggleResetForm = () => {
    setShowResetForm(!showResetForm);
    setError('');
    setSuccess('');
  };

  return (
    <div className="auth-container forgot-password-page">
      <div className="background-design">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
        <div className="circle circle-4"></div>
      </div>
      
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <i className="fas fa-recycle"></i>
            <span>WasteWise</span>
          </div>
          
          {passwordReset ? (
            <>
              <h1>Password Reset Successful</h1>
              <p>Your password has been updated successfully</p>
            </>
          ) : showResetForm ? (
            <>
              <h1>Reset Your Password</h1>
              <p>Enter your reset token and new password</p>
            </>
          ) : emailSent ? (
            <>
              <h1>Check Your Email</h1>
              <p>We've sent password reset instructions to your email</p>
            </>
          ) : (
            <>
              <h1>Reset Your Password</h1>
              <p>Enter your email and we'll send you instructions to reset your password</p>
            </>
          )}
        </div>

        {error && (
          <div className="alert-message error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
            <button className="alert-close" onClick={() => setError('')}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {success && (
          <div className="alert-message success">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
            <button className="alert-close" onClick={() => setSuccess('')}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Password Reset Success State */}
        {passwordReset ? (
          <div className="success-state">
            <div className="success-icon">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="success-content">
              <h3>Password Reset Successful!</h3>
              <p>Your password has been updated successfully. You can now sign in with your new password.</p>
              
              <div className="action-buttons">
                <Link to="/auth" className="btn btn-primary btn-full" onClick={handleBackToLogin}>
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In Now
                </Link>
                
                <button 
                  type="button" 
                  className="btn btn-secondary btn-full"
                  onClick={handleResetAnother}
                >
                  <i className="fas fa-redo"></i>
                  Reset Another Password
                </button>
              </div>
            </div>
          </div>
        ) : showResetForm ? (
          /* Password Reset Form */
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="role">Account Type</label>
              <div className="input-with-icon">
                <i className="fas fa-user-tag"></i>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-control"
                  disabled={loading}
                >
                  <option value="citizen">Citizen/Resident</option>
                  <option value="driver">Driver/Worker</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <small className="form-text">Select your account type</small>
            </div>

            <div className="form-group">
              <label htmlFor="resetToken">Reset Token</label>
              <div className="input-with-icon">
                <i className="fas fa-key"></i>
                <input
                  type="text"
                  id="resetToken"
                  name="resetToken"
                  value={formData.resetToken}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Enter the reset token from your email"
                  className="form-control"
                />
              </div>
              <small className="form-text">
                Enter the reset token you received in your email
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="input-with-icon">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Enter your new password"
                  className="form-control"
                  minLength="8"
                />
              </div>
              <small className="form-text">
                Must be at least 8 characters with uppercase, lowercase, and number
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-icon">
                <i className="fas fa-lock"></i>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Confirm your new password"
                  className="form-control"
                  minLength="8"
                />
              </div>
              <small className="form-text">Re-enter your new password to confirm</small>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading || !formData.resetToken.trim() || !formData.newPassword.trim() || !formData.confirmPassword.trim()}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Resetting Password...
                </>
              ) : (
                <>
                  <i className="fas fa-key"></i>
                  Reset Password
                </>
              )}
            </button>

            <div className="form-footer-links">
              <button 
                type="button" 
                className="btn-link"
                onClick={toggleResetForm}
              >
                <i className="fas fa-arrow-left"></i>
                Back to Email Request
              </button>
            </div>
          </form>
        ) : !emailSent ? (
          /* Forgot Password Form */
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <label htmlFor="role">Account Type</label>
              <div className="input-with-icon">
                <i className="fas fa-user-tag"></i>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="form-control"
                  disabled={loading}
                >
                  <option value="citizen">Citizen/Resident</option>
                  <option value="driver">Driver/Worker</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <small className="form-text">Select your account type</small>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-with-icon">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  placeholder="Enter your registered email address"
                  className="form-control"
                />
              </div>
              <small className="form-text">
                We'll send a password reset link to this email
              </small>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading || !formData.email.trim()}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Sending Instructions...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Send Reset Instructions
                </>
              )}
            </button>

            <div className="form-footer-links">
              <button 
                type="button" 
                className="btn-link"
                onClick={toggleResetForm}
              >
                <i className="fas fa-key"></i>
                Already have a reset token?
              </button>
            </div>
          </form>
        ) : (
          /* Email Sent Success State */
          <div className="success-state">
            <div className="success-icon">
              <i className="fas fa-envelope-open-text"></i>
            </div>
            <div className="success-content">
              <h3>Check Your Email</h3>
              <p>We've sent password reset instructions to:</p>
              <div className="email-display">{formData.email}</div>
              <p className="instructions">
                Please check your inbox and follow the instructions in the email to reset your password.
                The link will expire in 1 hour for security reasons.
              </p>
              
              <div className="action-buttons">
                <button 
                  type="button" 
                  className="btn btn-primary btn-full"
                  onClick={handleResend}
                >
                  <i className="fas fa-redo"></i>
                  Resend Instructions
                </button>

                <button 
                  type="button" 
                  className="btn btn-secondary btn-full"
                  onClick={toggleResetForm}
                >
                  <i className="fas fa-key"></i>
                  I have a reset token
                </button>
                
                <div className="help-text">
                  <p>Didn't receive the email?</p>
                  <ul>
                    <li>Check your spam or junk folder</li>
                    <li>Verify you entered the correct email address</li>
                    <li>Wait a few minutes and try again</li>
                    <li>Contact support if the problem persists</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="auth-footer">
          <p>
            Remember your password?{' '}
            <Link to="/auth" onClick={handleBackToLogin}>
              Back to Sign In
            </Link>
          </p>
          <p>
            Don't have an account?{' '}
            <Link to="/register" onClick={handleBackToLogin}>
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;