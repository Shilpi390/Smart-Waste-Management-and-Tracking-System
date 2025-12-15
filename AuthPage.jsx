import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { authAPI } from '../services/api';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: '', // This should match backend role names
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const user = JSON.parse(localStorage.getItem('user'));
      redirectBasedOnRole(user?.role);
    }
  }, [isAuthenticated, navigate]);

  // Generate math CAPTCHA on component mount
  useEffect(() => {
    generateMathCaptcha();
  }, []);

  // Generate math CAPTCHA question
  const generateMathCaptcha = () => {
    const operations = ['+', '-'];
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operator = operations[Math.floor(Math.random() * operations.length)];
    
    let question = '';
    let answer = 0;
    
    switch(operator) {
      case '+':
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
        break;
      case '-':
        const larger = Math.max(num1, num2);
        const smaller = Math.min(num1, num2);
        question = `${larger} - ${smaller}`;
        answer = larger - smaller;
        break;
      default:
        question = `${num1} + ${num2}`;
        answer = num1 + num2;
    }
    
    setCaptchaQuestion(question);
    setCaptchaAnswer(answer.toString());
    setCaptchaInput('');
  };

  // Role-based redirection
  const redirectBasedOnRole = (role) => {
    console.log('Redirecting based on role:', role);
    switch (role) {
      case 'admin':
        navigate('/admindashboard');
        break;
      case 'driver':
        navigate('/driverdashboard');
        break;
      case 'citizen':
        navigate('/citizen');
        break;
      default:
        navigate('/auth');
        break;
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCaptchaChange = (e) => {
    setCaptchaInput(e.target.value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 6;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate email format
    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // Validate password length
    if (!validatePassword(formData.password)) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Validate CAPTCHA
    if (captchaInput !== captchaAnswer) {
      setError('CAPTCHA verification failed. Please try again.');
      generateMathCaptcha();
      return;
    }

    setLoading(true);

    try {
      console.log('Sending login request...', formData);
      
      // Make API call to authenticate user - send email, password, and role
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
        role: formData.role // Include role in the request
      });
      
      console.log('Login API Response:', response);

      // Check if response has data
      if (response.data) {
        const { success, user, token, message } = response.data;
        
        if (success && user && token) {
          console.log('Login successful, user:', user);
          
          // Call the login function from AuthContext
          const loginResult = await login(user, token);
          
          if (loginResult.success) {
            console.log('AuthContext login successful, redirecting...');
            // Redirect based on user role from backend
            redirectBasedOnRole(user.role);
          } else {
            setError('Authentication failed. Please try again.');
            generateMathCaptcha();
          }
        } else {
          setError(message || 'Invalid credentials. Please try again.');
          generateMathCaptcha();
        }
      } else {
        setError('Invalid response from server.');
        generateMathCaptcha();
      }
    } catch (err) {
      console.error('Login error details:', err);
      
      // Enhanced error handling for backend responses
      if (err.response?.data) {
        const backendError = err.response.data;
        setError(backendError.message || backendError.error || 'Login failed');
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
      generateMathCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container login-page">
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
            <span>
              <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  WasteWise
              </a>
            </span>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to access your waste management account</p>
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="role">I am a</label>
            <div className="input-with-icon">
              <i className="fas fa-user-tag"></i>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-control"
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
                placeholder="Enter your email address"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <i className="fas fa-lock"></i>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                className="form-control"
              />
              <button 
                type="button" 
                className="password-toggle"
                onClick={togglePasswordVisibility}
              >
                <i className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
              </button>
            </div>
            <div className="forgotpassword">
              <Link to="/forgotpassword">Forgot password?</Link>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="captcha">Security Verification</label>
            <div className="captcha-container">
              <div className="captcha-display">
                <span>Solve: {captchaQuestion} = ?</span>
                <button 
                  type="button" 
                  className="captcha-refresh"
                  onClick={generateMathCaptcha}
                  title="Generate new CAPTCHA"
                >
                  <i className="fas fa-redo"></i>
                </button>
              </div>
              <div className="input-with-icon">
                <i className="fas fa-shield-alt"></i>
                <input
                  type="number"
                  id="captcha"
                  value={captchaInput}
                  onChange={handleCaptchaChange}
                  required
                  placeholder="Enter the answer"
                  className="form-control captcha-input"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Signing in...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register">Create account</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;