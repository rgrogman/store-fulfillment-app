import { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import LandingScreen from "./LandingScreen";
import DashboardScreen from "./DashboardScreen";
import PickScreen from "./PickScreen";
import EcomSimulator from "./EcomSimulator";
import AdminScreen from "./AdminScreen";
import PackShipScreen from "./PackShipScreen";
import ExceptionScreen from "./ExceptionScreen";
import CustomerPickupScreen from "./CustomerPickupScreen";
import DailyOrdersScreen from "./DailyOrdersScreen";
import IntegrationDrawer from "./IntegrationDrawer";
import { IntegrationProvider } from "./IntegrationContext";

function TopNav() {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const initialLoad = useRef(true);

  // Professional synthesized "Ding" using native Web Audio API
  const playDing = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 Note
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime); // Volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); // Fade out
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio API not supported on this browser.");
    }
  };

  useEffect(() => {
    // Real-time listener for Pending orders
    const q = query(collection(db, "orders"), where("status", "==", "Pending"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingCount(snapshot.docs.length);

      // Prevent the alert from firing on the initial page load
      if (initialLoad.current) {
        initialLoad.current = false;
        return;
      }

      // Check if the snapshot trigger was caused by a brand NEW order
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const orderData = change.doc.data();
          const orderId = orderData.orderId || "New Order";
          const orderType = orderData.orderType || "SFS";

          setToast({ visible: true, message: `${orderType} ${orderId}` });
          playDing();

          // Auto-hide the toast after 5 seconds
          setTimeout(() => {
            setToast({ visible: false, message: "" });
          }, 5000);
        }
      });
    });

    return () => unsubscribe();
  }, []);
  
  const navItemStyle = (path: string) => ({
    color: location.pathname === path ? '#FFFFFF' : '#A0A0A0',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '10px 15px',
    borderBottom: location.pathname === path ? '2px solid #27AE60' : 'none'
  });

  return (
    <>
      {/* Injecting CSS Keyframes for the Pulse Animation */}
      <style>
        {`
          @keyframes pulseAlert {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.7); }
            70% { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(231, 76, 60, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
          }
          @keyframes slideInDown {
            from { transform: translateY(-100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>

      {/* Global Toast Notification Overlay */}
      {toast.visible && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          backgroundColor: '#1A2235',
          border: '2px solid #3498DB',
          color: '#FFF',
          padding: '15px 20px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '15px',
          animation: 'slideInDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <span style={{ fontSize: '24px' }}>🚨</span>
          <div>
            <strong style={{ display: 'block', fontSize: '15px', color: '#3498DB' }}>Urgent Action Required</strong>
            <span style={{ fontSize: '13px', color: '#E0E0E0' }}>{toast.message} is waiting to be picked.</span>
          </div>
        </div>
      )}

      <nav style={{ 
        backgroundColor: '#131E3A', 
        padding: '10px 20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
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
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <Link to="/dashboard" style={navItemStyle('/dashboard')}>Dashboard</Link>
            
            {/* The Pick Link with Pulsing Badge */}
            <div style={{ position: 'relative' }}>
              <Link to="/pick" style={navItemStyle('/pick')}>Pick</Link>
              {pendingCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-5px',
                  backgroundColor: '#E74C3C',
                  color: 'white',
                  borderRadius: '50%',
                  height: '18px',
                  minWidth: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  animation: 'pulseAlert 2s infinite',
                  pointerEvents: 'none'
                }}>
                  {pendingCount}
                </span>
              )}
            </div>

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
    </>
  );
}

function App() {
  return (
    <IntegrationProvider>
      <Router>
        <div style={{ backgroundColor: '#0A1128', minHeight: '100vh', fontFamily: 'sans-serif', color: '#E0E0E0' }}>
          <TopNav />
          
          <IntegrationDrawer />
          
          <Routes>
            <Route path="/" element={<LandingScreen />} />
            <Route path="/dashboard" element={<DashboardScreen />} />
            <Route path="/ecomsim" element={<EcomSimulator />} />
            <Route path="/pick" element={<PickScreen />} />
            <Route path="/exceptions" element={<ExceptionScreen />} />
            <Route path="/pack" element={<PackShipScreen />} />
            <Route path="/pickup" element={<CustomerPickupScreen />} />
            <Route path="/history" element={<DailyOrdersScreen />} />
            <Route path="/admin" element={<AdminScreen />} /> 
          </Routes>
        </div>
      </Router>
    </IntegrationProvider>
  );
}

export default App;