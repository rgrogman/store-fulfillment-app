import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import PickScreen from "./PickScreen";
import EcomSimulator from "./EcomSimulator";

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
    <nav style={{ backgroundColor: '#131E3A', padding: '0 20px', display: 'flex', alignItems: 'center', borderBottom: '2px solid #2C3E50' }}>
      <div style={{ fontWeight: 'bold', fontSize: '20px', marginRight: '40px', color: '#FFFFFF', padding: '15px 0' }}>
        RCP Unified Demo
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <Link to="/" style={navItemStyle('/')}>E-Com Simulator</Link>
        <Link to="/pick" style={navItemStyle('/pick')}>Pick Screen</Link>
        <Link to="/pack" style={navItemStyle('/pack')}>Pack & Ship</Link>
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
          <Route path="/pack" element={<div style={{ padding: '40px', textAlign: 'center' }}>Pack screen coming next...</div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;