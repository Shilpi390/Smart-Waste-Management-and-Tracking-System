import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import AuthPage from "./pages/AuthPage";
import Citizen from "./pages/Citizen";
import Homepage from "./pages/Homepage";
import AdminDashboard from "./pages/AdminDashboard";
import DriverDashboard from "./pages/DriverDashboard";
import Register from "./pages/Register";
import Gallery from "./pages/Gallery";
import ForgotPassword from "./pages/ForgotPassword";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Default route for homepage */}
          <Route path="/" element={<Homepage />} />
          {/* Auth route for login/signup */}
          <Route path="/auth" element={<AuthPage />} />
          {/* Citizen dashboard */}
          <Route path="/citizen" element={<Citizen />} />
          {/* Admin dashboard */}
          <Route path="/admindashboard" element={<AdminDashboard />} />
          {/* Driver dashboard */}
          <Route path="/driverdashboard" element={<DriverDashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;