import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// Individual Card Component to handle local verification state
const PickupCard = ({ order, onComplete }: { order: any, onComplete: (id: string) => void }) => {
  const [isVerified, setIsVerified] = useState(false);

  return (
    <div style={{ border: '1px solid #E0E0E0', padding: '20px', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* Header & Staging Location */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#8E44AD' }}>{order.customer?.name}</h3>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}><strong>Order:</strong> {order.orderId}</p>
        </div>
        <div style={{ backgroundColor: '#F4ECF7', border: '2px solid #8E44AD', padding: '10px 15px', borderRadius: '8px', textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#555', textTransform: 'uppercase', marginBottom: '4px' }}>Staging Location</span>
          <strong style={{ fontSize: '18px', color: '#8E44AD' }}>{order.stagingLocation || "Front Desk"}</strong>
        </div>
      </div>

      {/* Item Manifest */}
      <div style={{ backgroundColor: '#F8F9FA', padding: '15px', borderRadius: '8px', fontSize: '14px', border: '1px solid #EAECEE' }}>
        <strong style={{ display: 'block', marginBottom: '8px', color: '#555' }}>Items to Hand Off:</strong>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          {order.items?.map((item: any, index: number) => (
            <li key={index} style={{ marginBottom: '6px' }}>
              <strong>{item.quantity}x</strong> {item.name}
            </li>
          ))}
        </ul>
      </div>

      {/* Verification & Action */}
      <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', color: isVerified ? '#27AE60' : '#E74C3C' }}>
          <input 
            type="checkbox" 
            checked={isVerified} 
            onChange={(e) => setIsVerified(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          {isVerified ? "✅ ID / Email Confirmed" : "Verify Customer ID or Email"}
        </label>

        <button 
          onClick={() => onComplete(order.id)}
          disabled={!isVerified}
          style={{ 
            backgroundColor: isVerified ? '#27AE60' : '#A0A0A0', 
            color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', 
            cursor: isVerified ? 'pointer' : 'not-allowed', 
            fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.3s'
          }}
        >
          Complete Handoff
        </button>
      </div>
    </div>
  );
};

function CustomerPickupScreen() {
  const [pickupOrders, setPickupOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPickupOrders = async () => {
    try {
      const q = query(collection(db, "orders"), where("status", "==", "Ready for Pickup"));
      const querySnapshot = await getDocs(q);
      
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPickupOrders(orders);
    } catch (error) {
      console.error("Error fetching pickup orders: ", error);
    }
  };

  useEffect(() => {
    fetchPickupOrders();
  }, []);

  const handleCompletePickup = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "Completed" });
      fetchPickupOrders(); // Refresh the list
    } catch (error) {
      console.error("Error completing pickup: ", error);
      alert("Failed to complete order handoff.");
    }
  };

  // Filter logic for the search bar
  const filteredOrders = pickupOrders.filter(order => 
    order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header and Search Bar */}
      <div style={{ marginBottom: '30px', backgroundColor: '#131E3A', padding: '20px', borderRadius: '12px', border: '1px solid #2C3E50', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#E0E0E0' }}>Customer Pickup Desk</h1>
          <span style={{ backgroundColor: '#8E44AD', color: '#FFFFFF', padding: '6px 15px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
            {pickupOrders.length} Waiting
          </span>
        </div>
        
        <input 
          type="text" 
          placeholder="🔍 Search by Customer Name or Order ID..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '12px 15px', borderRadius: '6px', border: 'none', fontSize: '16px', boxSizing: 'border-box' }}
        />
      </div>

      {/* Orders List */}
      {pickupOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#A0A0A0', fontStyle: 'italic', backgroundColor: '#131E3A', borderRadius: '12px', border: '1px solid #2C3E50' }}>
          No orders are currently staged for pickup.
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#A0A0A0', fontStyle: 'italic' }}>
          No matching orders found for "{searchQuery}".
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredOrders.map(order => (
            <PickupCard key={order.id} order={order} onComplete={handleCompletePickup} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomerPickupScreen;