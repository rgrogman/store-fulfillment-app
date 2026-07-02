import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
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
  borderBottom: '2px solid #2C3E50',
  position: 'sticky', 
  top: 0, 
  zIndex: 1000,
  /* Mobile-Responsive Fixes */
  overflowX: 'auto',       // Enables swipe-scrolling
  whiteSpace: 'nowrap',    // Keeps links in one row
  WebkitOverflowScrolling: 'touch' // Makes scroll smooth on iOS
}}>
  <div style={{ fontWeight: 'bold', fontSize: '18px', marginRight: '20px', color: '#FFFFFF', flexShrink: 0 }}>
    SwiftPick
  </div>
  <div style={{ display: 'flex', gap: '15px' }}>
    <Link to="/" style={navItemStyle('/')}>E-Com</Link>
    <Link to="/pick" style={navItemStyle('/pick')}>Pick</Link>
    <Link to="/exceptions" style={navItemStyle('/exceptions')}>Exceptions</Link>
    <Link to="/pack" style={navItemStyle('/pack')}>Pack</Link>
    <Link to="/pickup" style={navItemStyle('/pickup')}>Pickup</Link>
    <Link to="/history" style={navItemStyle('/history')}>History</Link>
    <Link to="/admin" style={navItemStyle('/admin')}>Admin</Link>
  </div>
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
          <Route path="/" element={<EcomSimulator />} />
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