import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import CitizenDashboard from "./pages/CitizenDashboard";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/citizen" element={<CitizenDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
