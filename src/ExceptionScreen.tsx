import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";

function ExceptionScreen() {
  const [exceptionOrders, setExceptionOrders] = useState<any[]>([]);
const [isAuthorized, setIsAuthorized] = useState(true);
useEffect(() => {
  const storedUser = localStorage.getItem("swiftpick_user");
  if (storedUser) {
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== "manager") {
      setIsAuthorized(false);
    }
  } else {
    // Kick them out if they aren't logged in at all
    window.location.href = "/"; 
  }
}, []);

  const fetchExceptionOrders = async () => {
    try {
      const q = query(collection(db, "orders"), where("status", "==", "Exception"));
      const querySnapshot = await getDocs(q);
      
      const ordersArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setExceptionOrders(ordersArray);
    } catch (error) {
      console.error("Error fetching exception orders: ", error);
    }
  };

  useEffect(() => {
    fetchExceptionOrders();
  }, []);

  const handleOverride = async (orderId: string, itemIndex: number) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data();
      const updatedItems = [...orderData.items];
      const overriddenItem = updatedItems[itemIndex];

      // 1. Change the item status back to Picked
      overriddenItem.status = "Picked";

      // 2. Decrement the inventory (since it wasn't decremented during the initial exception)
      await updateDoc(doc(db, "products", overriddenItem.sku), { 
        stock: increment(-overriddenItem.quantity) 
      });

      // 3. Check if the order is completely resolved
      const stillHasExceptions = updatedItems.some((item: any) => item.status.includes("Exception"));
      const newOrderStatus = stillHasExceptions ? "Exception" : "Picked";

      // 4. Update the order and refresh UI
      await updateDoc(orderRef, {
        items: updatedItems,
        status: newOrderStatus
      });
      
      fetchExceptionOrders();
      
      if (!stillHasExceptions) {
        alert(`Order ${orderData.orderId} fully resolved and sent to Pack & Ship.`);
      }

    } catch (error) {
      console.error("Error overriding exception: ", error);
      alert("Failed to override item.");
    }
  };

  const handleConfirmException = async (orderId: string) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;

      const orderData = orderSnap.data();

      // Separate the successful picks from the exceptions
      const goodItems = orderData.items.filter((item: any) => item.status === "Picked");
      const badItems = orderData.items.filter((item: any) => item.status.includes("Exception"));

      if (goodItems.length > 0) {
        // Split & Release workflow
        await updateDoc(orderRef, {
          items: goodItems,
          status: "Picked", 
          exceptionNotes: `System split: ${badItems.length} item(s) rejected to OMS.`
        });
        alert(`Split & Release Successful.\n\n${goodItems.length} item(s) released to Pack & Ship.\n${badItems.length} item(s) rejected back to OMS for re-routing.`);
      } else {
        // Total Failure workflow (Nothing was picked)
        await updateDoc(orderRef, {
          status: "Rejected_To_OMS" // Removes it from all active store views
        });
        alert(`Total Exception Confirmed.\n\nEntire order rejected back to OMS for re-routing or cancellation.`);
      }

      fetchExceptionOrders();
    } catch (error) {
      console.error("Error confirming exception: ", error);
      alert("Failed to process exception split.");
    }
  };
if (!isAuthorized) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ backgroundColor: '#FDEDEC', border: '2px solid #C0392B', padding: '40px', borderRadius: '12px', maxWidth: '500px', margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#C0392B', margin: '0 0 10px 0', fontSize: '24px' }}>⚠️ Access Denied</h2>
        <p style={{ color: '#555', fontSize: '16px', margin: 0 }}>
          Your current role (<strong>Associate</strong>) does not have permission to view or resolve inventory exceptions. Please request a Manager override.
        </p>
      </div>
    </div>
  );
}
  return (
    <div style={{ padding: '40px 20px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #C0392B', paddingBottom: '15px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#E0E0E0' }}>Manager Resolution Queue</h1>
        <span style={{ backgroundColor: '#C0392B', color: '#FFFFFF', padding: '6px 15px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
          {exceptionOrders.length} Action(s) Required
        </span>
      </div>

      {exceptionOrders.length === 0 ? (
        <div style={{ backgroundColor: '#131E3A', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #2C3E50' }}>
          <p style={{ color: '#A0A0A0', fontSize: '16px', margin: 0 }}>Queue is clear. No active exceptions.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {exceptionOrders.map((order) => (
            <div key={order.id} style={{ border: '1px solid #E0E0E0', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              
              {/* Order Header */}
              <div style={{ backgroundColor: '#FADBD8', padding: '15px 20px', borderBottom: '1px solid #E0E0E0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', color: '#C0392B' }}>Order {order.orderId}</h3>
                  <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#555' }}>
                    <strong>Type:</strong> {order.orderType} | <strong>Customer:</strong> {order.customer?.name}
                  </p>
                </div>
                <button 
                  onClick={() => handleConfirmException(order.id)}
                  style={{ backgroundColor: '#C0392B', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Confirm Exception & Release Order
                </button>
              </div>

              {/* Order Items List */}
              <div style={{ padding: '20px' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#555', textTransform: 'uppercase' }}>Item Manifest</h4>
                
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {order.items?.map((item: any, index: number) => {
                    const isException = item.status?.includes('Exception');
                    
                    return (
                      <li key={index} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '12px 15px', marginBottom: '10px', 
                        backgroundColor: isException ? '#FDEDEC' : '#F8F9FA',
                        borderLeft: isException ? '4px solid #C0392B' : '4px solid #27AE60',
                        borderRadius: '4px'
                      }}>
                        <div>
                          <strong style={{ fontSize: '15px' }}>{item.quantity}x {item.name}</strong>
                          <div style={{ fontSize: '12px', color: isException ? '#C0392B' : '#27AE60', marginTop: '4px', fontWeight: 'bold' }}>
                            Status: {item.status}
                          </div>
                        </div>

                        {/* Only show Override button for problem items */}
                        {isException && (
                          <button 
                            onClick={() => handleOverride(order.id, index)}
                            style={{ backgroundColor: '#F39C12', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                          >
                            Override to 'Picked'
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExceptionScreen;