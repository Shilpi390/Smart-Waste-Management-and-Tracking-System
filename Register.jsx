import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    role: 'citizen',
    // Common fields
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    // Driver-specific fields
    employeeId: '',
    vehicle: '',
    license: '',
    experience: '',
    // Admin-specific fields
    department: '',
    adminRole: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Show password requirements when user starts typing in password field
    if (name === 'password' && value.length > 0) {
      setShowPasswordRequirements(true);
    } else if (name === 'password' && value.length === 0) {
      setShowPasswordRequirements(false);
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const togglePasswordVisibility = (field) => {
    if (field === 'password') {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/;
    return phoneRegex.test(phone);
  };

  const validateName = (name) => {
    // Name should not contain numbers and should have at least 2 characters
    const nameRegex = /^[a-zA-Z\s]{2,}$/;
    return nameRegex.test(name);
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!formData.name) {
      newErrors.name = 'Name is required';
    } else if (!validateName(formData.name)) {
      newErrors.name = 'Name should contain only letters and spaces, and be at least 2 characters long';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must contain at least 8 characters, one uppercase, one lowercase, one number and one special character';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.address) newErrors.address = 'Address is required';

    // Role-specific validations
    if (formData.role === 'driver') {
      if (!formData.employeeId) newErrors.employeeId = 'Employee ID is required';
      if (!formData.vehicle) newErrors.vehicle = 'Vehicle information is required';
      if (!formData.license) newErrors.license = 'License number is required';
      if (!formData.experience) newErrors.experience = 'Experience is required';
    }

    if (formData.role === 'admin') {
      if (!formData.department) newErrors.department = 'Department is required';
      if (!formData.adminRole) newErrors.adminRole = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setSuccess('');
    setErrors({});

    try {
      // Prepare data for API call based on role - match backend field names
      const userData = {
        role: formData.role,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: formData.address
      };

      // Add role-specific fields with correct field names for backend
      if (formData.role === 'driver') {
        userData.employeeId = formData.employeeId;
        userData.vehicle = formData.vehicle;
        userData.license = formData.license; // Backend expects 'license' but stores as 'license_number'
        userData.experience = formData.experience;
      } else if (formData.role === 'admin') {
        userData.department = formData.department;
        userData.adminRole = formData.adminRole;
      }

      console.log('Sending registration data:', userData);

      // Make API call to register user
      const response = await authAPI.register(userData);
      
      console.log('Registration response:', response);
      
      if (response.data.success) {
        setSuccess('Account created successfully! Redirecting to login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      } else {
        setErrors({ submit: response.data.message || 'Registration failed. Please try again.' });
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          'Registration failed. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of the render methods remain exactly the same - citizenForm, driverForm, adminForm, passwordFields)

  const renderCitizenForm = () => (
    <>
      <div className="form-group">
        <label htmlFor="name">Full Name *</label>
        <div className="input-with-icon">
          <i className="fas fa-user"></i>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            placeholder="Enter your full name"
          />
        </div>
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address *</label>
        <div className="input-with-icon">
          <i className="fas fa-envelope"></i>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="Enter your email address"
          />
        </div>
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone Number *</label>
        <div className="input-with-icon">
          <i className="fas fa-phone"></i>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            placeholder="Enter your phone number"
          />
        </div>
        {errors.phone && <span className="error-text">{errors.phone}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="address">Address *</label>
        <div className="input-with-icon">
          <i className="fas fa-home"></i>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={errors.address ? 'error' : ''}
            placeholder="Enter your complete address"
            rows="3"
          />
        </div>
        {errors.address && <span className="error-text">{errors.address}</span>}
      </div>
    </>
  );

  const renderDriverForm = () => (
    <>
      <div className="form-group">
        <label htmlFor="name">Full Name *</label>
        <div className="input-with-icon">
          <i className="fas fa-user"></i>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            placeholder="Enter your full name"
          />
        </div>
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="employeeId">Employee ID *</label>
        <div className="input-with-icon">
          <i className="fas fa-id-card"></i>
          <input
            type="text"
            id="employeeId"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleChange}
            className={errors.employeeId ? 'error' : ''}
            placeholder="Enter your employee ID"
          />
        </div>
        {errors.employeeId && <span className="error-text">{errors.employeeId}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address *</label>
        <div className="input-with-icon">
          <i className="fas fa-envelope"></i>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="Enter your email address"
          />
        </div>
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone Number *</label>
        <div className="input-with-icon">
          <i className="fas fa-phone"></i>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            placeholder="Enter your phone number"
          />
        </div>
        {errors.phone && <span className="error-text">{errors.phone}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="vehicle">Vehicle Type *</label>
          <div className="input-with-icon">
            <i className="fas fa-truck"></i>
            <select
              id="vehicle"
              name="vehicle"
              value={formData.vehicle}
              onChange={handleChange}
              className={errors.vehicle ? 'error' : ''}
            >
              <option value="">Select Vehicle Type</option>
              <option value="truck">Garbage Truck</option>
              <option value="van">Collection Van</option>
              <option value="compactor">Waste Compactor</option>
              <option value="other">Other</option>
            </select>
          </div>
          {errors.vehicle && <span className="error-text">{errors.vehicle}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="experience">Experience (Years) *</label>
          <div className="input-with-icon">
            <i className="fas fa-briefcase"></i>
            <input
              type="number"
              id="experience"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              className={errors.experience ? 'error' : ''}
              placeholder="Years of experience"
              min="0"
              max="50"
            />
          </div>
          {errors.experience && <span className="error-text">{errors.experience}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="license">Driver's License Number *</label>
        <div className="input-with-icon">
          <i className="fas fa-id-card-alt"></i>
          <input
            type="text"
            id="license"
            name="license"
            value={formData.license}
            onChange={handleChange}
            className={errors.license ? 'error' : ''}
            placeholder="Enter your license number"
          />
        </div>
        {errors.license && <span className="error-text">{errors.license}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="address">Address *</label>
        <div className="input-with-icon">
          <i className="fas fa-home"></i>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={errors.address ? 'error' : ''}
            placeholder="Enter your complete address"
            rows="3"
            style={{ paddingTop: '12px', paddingBottom: '12px' }}
          />
        </div>
        {errors.address && <span className="error-text">{errors.address}</span>}
      </div>
    </>
  );

  const renderAdminForm = () => (
    <>
      <div className="form-group">
        <label htmlFor="name">Full Name *</label>
        <div className="input-with-icon">
          <i className="fas fa-user"></i>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            placeholder="Enter your full name"
          />
        </div>
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email">Email Address *</label>
        <div className="input-with-icon">
          <i className="fas fa-envelope"></i>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            placeholder="Enter your email address"
          />
        </div>
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="department">Department *</label>
          <div className="input-with-icon">
            <i className="fas fa-building"></i>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleChange}
              className={errors.department ? 'error' : ''}
            >
              <option value="">Select Department</option>
              <option value="operations">Operations</option>
              <option value="planning">Planning & Strategy</option>
              <option value="customer">Customer Service</option>
              <option value="finance">Finance</option>
              <option value="compliance">Compliance</option>
            </select>
          </div>
          {errors.department && <span className="error-text">{errors.department}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="adminRole">Role *</label>
          <div className="input-with-icon">
            <i className="fas fa-user-tie"></i>
            <select
              id="adminRole"
              name="adminRole"
              value={formData.adminRole}
              onChange={handleChange}
              className={errors.adminRole ? 'error' : ''}
            >
              <option value="">Select Role</option>
              <option value="manager">Manager</option>
              <option value="supervisor">Supervisor</option>
              <option value="coordinator">Coordinator</option>
              <option value="director">Director</option>
              <option value="analyst">Analyst</option>
            </select>
          </div>
          {errors.adminRole && <span className="error-text">{errors.adminRole}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="phone">Phone Number *</label>
        <div className="input-with-icon">
          <i className="fas fa-phone"></i>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            placeholder="Enter your phone number"
          />
        </div>
        {errors.phone && <span className="error-text">{errors.phone}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="address">Address *</label>
        <div className="input-with-icon">
          <i className="fas fa-home"></i>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className={errors.address ? 'error' : ''}
            placeholder="Enter your complete address"
            rows="3"
            style={{ paddingTop: '12px', paddingBottom: '12px' }}
          />
        </div>
        {errors.address && <span className="error-text">{errors.address}</span>}
      </div>
    </>
  );

  const renderPasswordFields = () => (
    <>
      <div className="form-group">
        <label htmlFor="password">Password *</label>
        <div className="input-with-icon">
          <i className="fas fa-lock"></i>
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
            placeholder="Create a strong password"
          />
          <button 
            type="button" 
            className="password-toggle"
            onClick={() => togglePasswordVisibility('password')}
          >
            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
          </button>
        </div>
        {errors.password && <span className="error-text">{errors.password}</span>}
        
        {/* Password requirements - only show when user is typing */}
        {showPasswordRequirements && (
          <div className="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li className={formData.password.match(/[a-z]/) ? 'valid' : ''}>At least one lowercase letter</li>
              <li className={formData.password.match(/[A-Z]/) ? 'valid' : ''}>At least one uppercase letter</li>
              <li className={formData.password.match(/\d/) ? 'valid' : ''}>At least one number</li>
              <li className={formData.password.match(/[@$!%*?&]/) ? 'valid' : ''}>At least one special character (@$!%*?&)</li>
              <li className={formData.password.length >= 8 ? 'valid' : ''}>Minimum 8 characters</li>
            </ul>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword">Confirm Password *</label>
        <div className="input-with-icon">
          <i className="fas fa-lock"></i>
          <input
            type={showConfirmPassword ? "text" : "password"}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={errors.confirmPassword ? 'error' : ''}
            placeholder="Confirm your password"
          />
          <button 
            type="button" 
            className="password-toggle"
            onClick={() => togglePasswordVisibility('confirm')}
          >
            <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
          </button>
        </div>
        {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
      </div>
    </>
  );

  return (
    <div className="auth-container register-page">
      <div className="background-design">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
        <div className="circle circle-4"></div>
      </div>
      
      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="logo">
            <i className="fas fa-recycle"></i>
            <span>WasteWise</span>
          </div>
          <h1>Create Account</h1>
          <p>Join our waste management community</p>
        </div>

        {errors.submit && (
          <div className="alert-message error">
            <i className="fas fa-exclamation-circle"></i>
            <span>{errors.submit}</span>
            <button className="alert-close" onClick={() => setErrors({...errors, submit: ''})}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {success && (
          <div className="alert-message success">
            <i className="fas fa-check-circle"></i>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="role">I am a *</label>
            <div className="input-with-icon">
              <i className="fas fa-user-tag"></i>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-control"
                required
              >
                <option value="citizen">Citizen/Resident</option>
                <option value="driver">Driver/Worker</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3><i className="fas fa-user-circle"></i> Personal Information</h3>
            {formData.role === 'citizen' && renderCitizenForm()}
            {formData.role === 'driver' && renderDriverForm()}
            {formData.role === 'admin' && renderAdminForm()}
          </div>

          <div className="form-section">
            <h3><i className="fas fa-shield-alt"></i> Security</h3>
            {renderPasswordFields()}
          </div>

          <div className="form-group terms">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span className="checkmark"></span>
              I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Creating Account...
              </>
            ) : (
              <>
                <i className="fas fa-user-plus"></i>
                Create Account
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/auth">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;