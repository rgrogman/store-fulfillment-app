import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import LandingScreen from "./LandingScreen";
import DashboardScreen from "./DashboardScreen";
import PickScreen from "./PickScreen";
import EcomSimulator from "./EcomSimulator";
import AdminScreen from "./AdminScreen";
import PackShipScreen from "./PackShipScreen";
import ExceptionScreen from "./ExceptionScreen";
import CustomerPickupScreen from "./CustomerPickupScreen";
import DailyOrdersScreen from "./DailyOrdersScreen";

// A simple navigation component
function TopNav() {
  const location = useLocation();
  
  const navItemStyle = (path: string) => ({
    color: location.pathname === path ? '#FFFFFF' : '#A0A0A0',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '10px 15px',
    borderBottom: location.pathname === path ? '2px solid #27AE60' : 'none'
  });

  return (
    <nav style={{ 
  backgroundColor: '#131E3A', 
  padding: '10px 20px', 
  display: 'flex', 
  alignItems: 'center', 
  justifyContent: 'space-between', /* Pushes the left and right sides apart */
  borderBottom: '2px solid #2C3E50',
  position: 'sticky', 
  top: 0, 
  zIndex: 1000,
  overflowX: 'auto',       
  whiteSpace: 'nowrap',    
  WebkitOverflowScrolling: 'touch' 
}}>
  
  {/* Left Side: Logo and Navigation Links */}
  <div style={{ display: 'flex', alignItems: 'center' }}>
    
    {/* NEW: White pill container for the dark logo */}
    <div style={{ 
      backgroundColor: '#FFFFFF', 
      padding: '5px 12px', 
      borderRadius: '6px', 
      marginRight: '20px', 
      display: 'flex', 
      alignItems: 'center', 
      flexShrink: 0 
    }}>
      <img src="/logo.png" alt="SwiftPick" style={{ height: '22px' }} />
    </div>
    <div style={{ display: 'flex', gap: '15px' }}>
      <Link to="/dashboard" style={navItemStyle('/dashboard')}>Dashboard</Link>
      <Link to="/pick" style={navItemStyle('/pick')}>Pick</Link>
      <Link to="/exceptions" style={navItemStyle('/exceptions')}>Exceptions</Link>
      <Link to="/pack" style={navItemStyle('/pack')}>Pack</Link>
      <Link to="/pickup" style={navItemStyle('/pickup')}>Pickup</Link>
      <Link to="/history" style={navItemStyle('/history')}>History</Link>
      <Link to="/admin" style={navItemStyle('/admin')}>Admin</Link>
    </div>
  </div>

  {/* Right Side: Quick Logout Button */}
  <button 
    onClick={() => {
      localStorage.removeItem("swiftpick_user");
      window.location.href = "/";
    }}
    style={{ 
      backgroundColor: 'transparent', 
      color: '#E74C3C', 
      border: '1px solid #E74C3C', 
      padding: '6px 14px', 
      borderRadius: '6px', 
      cursor: 'pointer', 
      fontWeight: 'bold', 
      fontSize: '13px', 
      marginLeft: '20px',
      flexShrink: 0,
      transition: 'background-color 0.2s'
    }}
  >
    Sign Out
  </button>
</nav>
  );
}

function App() {
  return (
    <Router>
      <div style={{ backgroundColor: '#0A1128', minHeight: '100vh', fontFamily: 'sans-serif', color: '#E0E0E0' }}>
        <TopNav />
        
        {/* The Routes determine which screen to show below the navigation */}
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/ecomsim" element={<EcomSimulator />} />
          <Route path="/pick" element={<PickScreen />} />
          <Route path="/exceptions" element={<ExceptionScreen />} />
          <Route path="/pack" element={<PackShipScreen />} />
          <Route path="/pickup" element={<CustomerPickupScreen />} />
          <Route path="/history" element={<DailyOrdersScreen />} />
          <Route path="/admin" element={<AdminScreen />} /> {/* ADD THIS ROUTE */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;