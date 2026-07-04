import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "./firebase";

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
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      
     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          In-Store Fulfillment Dashboard
        </h1>
        
        {/* User Session Badge */}
        <div style={{ 
          backgroundColor: '#2C3E50', // Shaded box background
          color: '#ECF0F1',           // Light text for contrast
          padding: '6px 14px', 
          borderRadius: '20px', 
          fontSize: '12px', 
          border: '1px solid #7F8C8D' 
        }}>
          Logged in: <strong style={{ color: '#FFFFFF' }}>{userName}</strong>
        </div>
      </div>

      {/* 2x2 Grid Container */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', width: '100%' }}>
        
        {/* Pick Queue */}
        <div onClick={() => navigate('/pick')} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer', borderTop: '6px solid #F39C12' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Orders to be Picked</span>
          <span style={{ backgroundColor: '#F39C12', color: '#FFF', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '24px', alignSelf: 'flex-start' }}>{counts.toPick}</span>
        </div>

        {/* Pack Queue */}
        <div onClick={() => navigate('/pack')} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer', borderTop: '6px solid #2980B9' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Orders to be Packed / Staged</span>
          <span style={{ backgroundColor: '#2980B9', color: '#FFF', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '24px', alignSelf: 'flex-start' }}>{counts.toPack}</span>
        </div>

        {/* Pickup Queue */}
        <div onClick={() => navigate('/pickup')} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer', borderTop: '6px solid #8E44AD' }}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Awaiting Customer Pickup</span>
          <span style={{ backgroundColor: '#8E44AD', color: '#FFF', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '24px', alignSelf: 'flex-start' }}>{counts.toPickup}</span>
        </div>

        {/* Exceptions Queue */}
        <div onClick={() => navigate('/exceptions')} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#FFFFFF', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', cursor: 'pointer', borderTop: '6px solid #C0392B'}}>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#C0392B' }}>Exceptions Requiring Action</span>
          <span style={{ backgroundColor: '#C0392B', color: '#FFF', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '24px', alignSelf: 'flex-start' }}>{counts.exceptions}</span>
        </div>

      </div>
    </div>
  );
}

export default DashboardScreen;