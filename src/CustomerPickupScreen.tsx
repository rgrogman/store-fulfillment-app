import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import { useIntegration } from "./IntegrationContext";

// SVG Icons
const CopyIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>;
const CheckCircleIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const BagIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>;
const LocationIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const BoxIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const ShieldIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
const SearchIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7F8C8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const FilterIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7F8C8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;

// Individual Card Component to handle local verification state
const PickupCard = ({ order, onComplete, onCancel }: { order: any, onComplete: (order: any) => void, onCancel: (order: any) => void }) => {
  const [isVerified, setIsVerified] = useState(false);

  // Extract initials for the avatar
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div style={{ marginBottom: '40px' }}>
      
      {/* Horizontal Workflow Stepper */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '25px', color: '#A0A0A0', fontSize: '13px' }}>
        
        {/* Step 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#2C3E50', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>✓</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#E0E0E0', fontWeight: 'bold', fontSize: '14px' }}>Search</span>
            <span style={{ fontSize: '12px' }}>Find customer</span>
          </div>
        </div>
        
        <div style={{ width: '80px', height: '1px', backgroundColor: '#2C3E50', margin: '0 20px' }} />
        
        {/* Step 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: !isVerified ? '#8E44AD' : '#2C3E50', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
            {!isVerified ? '2' : '✓'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: !isVerified ? '#8E44AD' : '#E0E0E0', fontWeight: 'bold', fontSize: '14px' }}>Verify</span>
            <span style={{ fontSize: '12px' }}>Confirm identity</span>
          </div>
        </div>
        
        <div style={{ width: '80px', height: '1px', backgroundColor: '#2C3E50', margin: '0 20px' }} />
        
        {/* Step 3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: isVerified ? '#8E44AD' : '#2C3E50', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>3</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: isVerified ? '#8E44AD' : '#A0A0A0', fontWeight: 'bold', fontSize: '14px' }}>Handoff</span>
            <span style={{ fontSize: '12px' }}>Complete pickup</span>
          </div>
        </div>

      </div>

      {/* Main Order Card */}
      <div style={{ border: '1px solid #EAECEE', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header & Staging Location */}
        <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #EAECEE' }}>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#F4ECF7', color: '#8E44AD', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', fontWeight: 'bold' }}>
              {getInitials(order.customer?.name)}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '22px', color: '#2C3E50', fontWeight: 'bold' }}>{order.customer?.name}</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555' }}>
                <strong>Order:</strong> {order.orderId} 
                <button onClick={() => alert("Manifest Details opened")} style={{ background: 'none', border: 'none', color: '#7F8C8D', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                  <CopyIcon />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#EAFAF1', color: '#27AE60', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #27AE60' }}>
                  <CheckCircleIcon /> Ready for Pickup
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F4ECF7', color: '#8E44AD', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #8E44AD' }}>
                  <BagIcon /> Customer Pickup
                </span>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#F4ECF7', border: '1px solid #D7BDE2', padding: '15px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ color: '#8E44AD' }}>
              <LocationIcon />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Staging Location</span>
              <strong style={{ fontSize: '18px', color: '#8E44AD' }}>{order.stagingLocation || "Service Desk"}</strong>
            </div>
          </div>
        </div>

        <div style={{ padding: '25px' }}>
          {/* Item Manifest */}
          <div style={{ border: '1px solid #EAECEE', borderRadius: '8px', overflow: 'hidden', marginBottom: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', backgroundColor: '#F8F9FA', borderBottom: '1px solid #EAECEE', color: '#2C3E50', fontWeight: 'bold', fontSize: '14px' }}>
              <BoxIcon /> Items to Hand Off
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {order.items?.map((item: any, index: number) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '15px 20px', borderBottom: index !== order.items.length - 1 ? '1px solid #EAECEE' : 'none', gap: '20px', backgroundColor: '#FFFFFF' }}>
                  
                  <div style={{ width: '50px', height: '50px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #EAECEE', overflow: 'hidden', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                      src={`/images/${item.sku}.png`} 
                      alt={item.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/50x50/F8F9FA/6C757D?text=${item.name.charAt(0).toUpperCase()}`; }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexGrow: 1 }}>
                    <span style={{ backgroundColor: '#F4ECF7', color: '#8E44AD', padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>{item.quantity}x</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#2C3E50' }}>{item.name}</span>
                      <span style={{ fontSize: '12px', color: '#7F8C8D' }}>SKU: {item.sku}</span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Verification Bar */}
          <div style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1', borderRadius: '8px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ color: '#2980B9', backgroundColor: '#D4E6F1', padding: '10px', borderRadius: '50%', display: 'flex' }}>
                <ShieldIcon />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ color: '#2980B9', fontSize: '15px' }}>Customer Verification</strong>
                <span style={{ color: '#5499C7', fontSize: '13px' }}>Required before completing handoff.</span>
              </div>
            </div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', color: '#2980B9', backgroundColor: '#FFF', padding: '10px 20px', borderRadius: '6px', border: '1px solid #AED6F1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <input 
                type="checkbox" 
                checked={isVerified} 
                onChange={(e) => setIsVerified(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2980B9' }}
              />
              ID or email verified
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px' }}>
            <button 
              onClick={() => onCancel(order)}
              style={{ 
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#FFFFFF', 
                color: '#C0392B', 
                border: '1px solid #C0392B', 
                padding: '16px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontWeight: 'bold', 
                fontSize: '15px', 
                transition: 'all 0.2s'
              }}
            >
              <BagIcon /> Cancel & Return to Stock
            </button>
            
            <button 
              onClick={() => onComplete(order)} 
              disabled={!isVerified}
              style={{ 
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isVerified ? '#8E44AD' : '#D7BDE2', 
                color: 'white', 
                border: 'none', 
                padding: '16px', 
                borderRadius: '8px', 
                cursor: isVerified ? 'pointer' : 'not-allowed', 
                fontWeight: 'bold', 
                fontSize: '15px', 
                transition: 'background-color 0.3s',
                boxShadow: isVerified ? '0 4px 12px rgba(142, 68, 173, 0.3)' : 'none'
              }}
            >
              <BagIcon /> Complete Handoff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function CustomerPickupScreen() {
  const [pickupOrders, setPickupOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  const { addEvent } = useIntegration();

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

  const handleCompletePickup = async (order: any) => {
    try {
      await updateDoc(doc(db, "orders", order.id), { 
        status: "Completed",
        pickupTime: new Date().toISOString()
      });

      addEvent("BOPIS_ORDER_COMPLETED", {
        orderId: order.orderId,
        customer: order.customer?.name,
        finalStatus: "DELIVERED_TO_CUSTOMER",
        verification: "ID_OR_EMAIL_CONFIRMED",
        location: {
          storeId: "STR-042",
          retrievedFrom: order.stagingLocation || "Front Desk"
        },
        financials: {
          action: "RECOGNIZE_REVENUE",
          timestamp: new Date().toISOString()
        }
      });

      fetchPickupOrders(); 
    } catch (error) {
      console.error("Error completing pickup: ", error);
      alert("Failed to complete order handoff.");
    }
  };

  const handleCancelOrder = async (order: any) => {
    const confirmCancel = window.confirm(`Are you sure you want to mark Order ${order.orderId} as abandoned and return items to stock?`);
    if (!confirmCancel) return;

    try {
      // 1. Update Firebase Order Status
      await updateDoc(doc(db, "orders", order.id), { 
        status: "Cancelled_Abandoned",
        cancelTime: new Date().toISOString()
      });

      // 2. Loop through picked items and return them to inventory
      for (const item of order.items) {
        if (item.status === "Picked") {
          await updateDoc(doc(db, "products", item.sku), { 
            stock: increment(item.quantity) 
          });

          // Fire individual RESTOCK events for the ERP
          addEvent("INVENTORY_INCREMENT", {
            orderId: order.orderId,
            sku: item.sku,
            itemName: item.name,
            quantityChange: item.quantity,
            reasonCode: "RETURN_TO_STOCK_ABANDONED",
            location: {
              storeId: "STR-042",
              nodeType: "RETAIL_STORE",
              returnedFrom: order.stagingLocation || "Front Desk"
            },
            timestamp: new Date().toISOString()
          });
        }
      }

      // 3. Fire the OMS Cancellation event for refund processing
      addEvent("OMS_ORDER_CANCELLED", {
        orderId: order.orderId,
        customer: order.customer?.name,
        reasonCode: "BOPIS_ABANDONED",
        action: "INITIATE_CUSTOMER_REFUND",
        location: {
          storeId: "STR-042"
        },
        timestamp: new Date().toISOString()
      });

      fetchPickupOrders(); 
    } catch (error) {
      console.error("Error cancelling order: ", error);
      alert("Failed to process order abandonment.");
    }
  };

  const filteredOrders = pickupOrders.filter(order => 
    order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.orderId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto', minHeight: '100vh' }}>
      
      {/* Header and Search Bar */}
      <div style={{ marginBottom: '40px', backgroundColor: '#131E3A', padding: '25px', borderRadius: '12px', border: '1px solid #2C3E50', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#8E44AD', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <UserIcon />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold', color: '#FFFFFF' }}>Customer Pickup Desk</h1>
              <p style={{ margin: '4px 0 0 0', color: '#A0A0A0', fontSize: '14px' }}>Search for a customer to begin handoff.</p>
            </div>
          </div>
          <span style={{ backgroundColor: '#8E44AD', color: '#FFFFFF', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserIcon /> {pickupOrders.length} Waiting
          </span>
        </div>
        
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', left: '15px', display: 'flex' }}>
            <SearchIcon />
          </div>
          <input 
            type="text" 
            placeholder="Search by Customer Name or Order ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '16px 15px 16px 45px', borderRadius: '8px', border: '1px solid #2C3E50', fontSize: '15px', boxSizing: 'border-box', backgroundColor: '#FFFFFF', color: '#2C3E50' }}
          />
          <div style={{ position: 'absolute', right: '15px', display: 'flex', borderLeft: '1px solid #EAECEE', paddingLeft: '15px', cursor: 'pointer' }}>
            <FilterIcon />
          </div>
        </div>
      </div>

      {/* Orders List */}
      {pickupOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#A0A0A0', backgroundColor: '#131E3A', borderRadius: '12px', border: '1px solid #2C3E50' }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#FFFFFF', fontSize: '20px' }}>All Caught Up!</h2>
          <p style={{ margin: 0, fontSize: '15px' }}>No orders are currently staged for pickup.</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 40px', color: '#A0A0A0', backgroundColor: '#131E3A', borderRadius: '12px', border: '1px solid #2C3E50' }}>
          <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔍</div>
          <h2 style={{ margin: '0 0 10px 0', color: '#FFFFFF', fontSize: '20px' }}>No Results</h2>
          <p style={{ margin: 0, fontSize: '15px' }}>No matching orders found for "{searchQuery}".</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredOrders.map(order => (
            <PickupCard 
              key={order.id} 
              order={order} 
              onComplete={handleCompletePickup} 
              onCancel={handleCancelOrder}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default CustomerPickupScreen;