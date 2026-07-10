import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";

// SVG Icons for the Dashboard Cards
const ClipboardIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="9" y1="14" x2="15" y2="14"></line><line x1="9" y1="18" x2="15" y2="18"></line><line x1="9" y1="10" x2="9.01" y2="10"></line></svg>;
const BoxIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const UserBagIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>;
const AlertIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;

function DashboardScreen() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({
    toPick: 0,
    toPack: 0,
    toPickup: 0,
    exceptions: 0
  });

  const [userName, setUserName] = useState("");

  useEffect(() => {
    // Pull the logged-in user's info from local storage
    const storedUser = localStorage.getItem("swiftpick_user");
    if (storedUser) {
      setUserName(JSON.parse(storedUser).name);
    } else {
      // If no session exists, kick them back to login
      navigate("/");
    }

    const fetchOrderStats = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "orders"));
        let pickCount = 0;
        let packCount = 0;
        let pickupCount = 0;
        let exceptionCount = 0;

        querySnapshot.forEach((doc) => {
          const status = doc.data().status;
          if (status === "Pending") pickCount++;
          if (status === "Picked") packCount++;
          if (status === "Ready for Pickup") pickupCount++;
          if (status === "Exception") exceptionCount++;
        });

        setCounts({
          toPick: pickCount,
          toPack: packCount,
          toPickup: pickupCount,
          exceptions: exceptionCount
        });
      } catch (error) {
        console.error("Error fetching stats: ", error);
      }
    };

    fetchOrderStats();
  }, [navigate]);

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#E0E0E0' }}>
          In-Store Fulfillment Dashboard
        </h1>
        
        {/* User Session Badge */}
        <div style={{ 
          backgroundColor: '#131E3A', 
          color: '#A0A0A0',           
          padding: '8px 16px', 
          borderRadius: '20px', 
          fontSize: '13px', 
          border: '1px solid #2C3E50',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          Logged in: <strong style={{ color: '#FFFFFF' }}>{userName}</strong>
        </div>
      </div>

      {/* 2x2 Grid Container */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '25px', width: '100%' }}>
        
        {/* Pick Queue */}
        <div onClick={() => navigate('/pick')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '35px 30px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', cursor: 'pointer', borderTop: '6px solid #F39C12', transition: 'transform 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ color: '#F39C12', display: 'flex' }}><ClipboardIcon /></div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2C3E50' }}>Orders to be Picked</span>
          </div>
          <span style={{ backgroundColor: '#F39C12', color: '#FFF', padding: '8px 20px', borderRadius: '24px', fontWeight: 'bold', fontSize: '26px' }}>
            {counts.toPick}
          </span>
        </div>

        {/* Pack Queue */}
        <div onClick={() => navigate('/pack')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '35px 30px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', cursor: 'pointer', borderTop: '6px solid #2980B9', transition: 'transform 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ color: '#2980B9', display: 'flex' }}><BoxIcon /></div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2C3E50' }}>Pack & Stage</span>
          </div>
          <span style={{ backgroundColor: '#2980B9', color: '#FFF', padding: '8px 20px', borderRadius: '24px', fontWeight: 'bold', fontSize: '26px' }}>
            {counts.toPack}
          </span>
        </div>

        {/* Pickup Queue */}
        <div onClick={() => navigate('/pickup')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '35px 30px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', cursor: 'pointer', borderTop: '6px solid #8E44AD', transition: 'transform 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ color: '#8E44AD', display: 'flex' }}><UserBagIcon /></div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2C3E50' }}>Customer Pickup</span>
          </div>
          <span style={{ backgroundColor: '#8E44AD', color: '#FFF', padding: '8px 20px', borderRadius: '24px', fontWeight: 'bold', fontSize: '26px' }}>
            {counts.toPickup}
          </span>
        </div>

        {/* Exceptions Queue */}
        <div onClick={() => navigate('/exceptions')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', padding: '35px 30px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', cursor: 'pointer', borderTop: '6px solid #C0392B', transition: 'transform 0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ color: '#C0392B', display: 'flex' }}><AlertIcon /></div>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2C3E50' }}>Exceptions / Alerts</span>
          </div>
          <span style={{ backgroundColor: '#C0392B', color: '#FFF', padding: '8px 20px', borderRadius: '24px', fontWeight: 'bold', fontSize: '26px' }}>
            {counts.exceptions}
          </span>
        </div>

      </div>
    </div>
  );
}

export default DashboardScreen;