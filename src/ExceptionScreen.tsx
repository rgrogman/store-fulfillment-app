import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "./firebase";
import { useIntegration } from "./IntegrationContext";

function ExceptionScreen() {
  const [exceptionOrders, setExceptionOrders] = useState<any[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const { addEvent } = useIntegration();

  useEffect(() => {
    const storedUser = localStorage.getItem("swiftpick_user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      if (parsedUser.role !== "manager") {
        setIsAuthorized(false);
      }
    } else {
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

      overriddenItem.status = "Picked";

      await updateDoc(doc(db, "products", overriddenItem.sku), { 
        stock: increment(-overriddenItem.quantity) 
      });

      addEvent("INVENTORY_DECREMENT", {
        orderId: orderData.orderId,
        sku: overriddenItem.sku,
        itemName: overriddenItem.name,
        quantityChange: -overriddenItem.quantity,
        reasonCode: "MANAGER_OVERRIDE_PICK",
        location: { storeId: "STR-042", nodeType: "RETAIL_STORE" },
        timestamp: new Date().toISOString()
      });

      const stillHasExceptions = updatedItems.some((item: any) => item.status.includes("Exception"));
      const newOrderStatus = stillHasExceptions ? "Exception" : "Picked";

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

      const goodItems = orderData.items.filter((item: any) => item.status === "Picked");
      const badItems = orderData.items.filter((item: any) => item.status.includes("Exception"));

      badItems.forEach((item: any) => {
        addEvent("OMS_EXCEPTION_ROUTING", {
          orderId: orderData.orderId,
          sku: item.sku,
          itemName: item.name,
          reasonCode: item.status.replace("Exception: ", "").toUpperCase().replace(/\s+/g, '_'),
          action: "REROUTE_TO_DC",
          location: { storeId: "STR-042" },
          timestamp: new Date().toISOString()
        });
      });

      if (goodItems.length > 0) {
        // Split & Release workflow
        await updateDoc(orderRef, {
          items: orderData.items, 
          status: "Picked", 
          exceptionNotes: `System split: ${badItems.length} item(s) rejected to OMS.`
        });
        alert(`Split & Release Successful.\n\n${goodItems.length} item(s) released to Pack & Ship.\n${badItems.length} item(s) rejected back to OMS for re-routing.`);
      } else {
        // Total Failure workflow
        await updateDoc(orderRef, {
          status: "Rejected_To_OMS" 
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
    <div style={{ padding: '40px 20px', maxWidth: '950px', margin: '0 auto' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {exceptionOrders.map((order) => (
            <div key={order.id} style={{ border: '1px solid #EAECEE', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              
              {/* Card Header */}
              <div style={{ backgroundColor: '#FADBD8', padding: '20px 25px', borderBottom: '1px solid #EAECEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#C0392B', fontWeight: 'bold' }}>Order {order.orderId}</h3>
                  <div style={{ display: 'flex', gap: '15px', marginTop: '8px', fontSize: '13px', color: '#555' }}>
                    <span><strong>Type:</strong> {order.orderType}</span>
                    <span><strong>Customer:</strong> {order.customer?.name}</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleConfirmException(order.id)}
                  style={{ backgroundColor: '#C0392B', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s', boxShadow: '0 2px 8px rgba(192, 57, 43, 0.3)' }}
                >
                  Confirm Exception & Release Order
                </button>
              </div>

              {/* Item Manifest Table */}
              <div style={{ padding: '25px' }}>
                <h4 style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item Manifest</h4>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #EAECEE', color: '#7F8C8D', fontSize: '12px', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 0', width: '50%' }}>Item</th>
                      <th style={{ padding: '10px 0' }}>Qty</th>
                      <th style={{ padding: '10px 0' }}>SKU</th>
                      <th style={{ padding: '10px 0', textAlign: 'right' }}>Status / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items?.map((item: any, index: number) => {
                      const isException = item.status?.includes('Exception');
                      
                      return (
                        <tr key={index} style={{ borderBottom: index !== order.items.length - 1 ? '1px solid #EAECEE' : 'none', backgroundColor: isException ? '#FDEDEC' : '#FFF' }}>
                          <td style={{ padding: '15px 10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ width: '50px', height: '50px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #EAECEE', overflow: 'hidden', flexShrink: 0 }}>
                              <img 
                                src={`/images/${item.sku}.png`} 
                                alt={item.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isException ? 0.6 : 1 }}
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/100x100/F8F9FA/6C757D?text=${item.name.charAt(0).toUpperCase()}`; }}
                              />
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: isException ? '#C0392B' : '#2C3E50' }}>
                              {item.name}
                            </span>
                          </td>
                          <td style={{ padding: '15px 10px', fontSize: '14px', fontWeight: 'bold', color: '#2C3E50' }}>{item.quantity}</td>
                          <td style={{ padding: '15px 10px', fontSize: '13px', color: '#555' }}>{item.sku}</td>
                          <td style={{ padding: '15px 10px', textAlign: 'right' }}>
                            {isException ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                                <span style={{ backgroundColor: '#FADBD8', color: '#C0392B', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #C0392B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                  {item.status}
                                </span>
                                <button 
                                  onClick={() => handleOverride(order.id, index)}
                                  style={{ backgroundColor: '#F39C12', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', transition: 'background-color 0.2s' }}
                                >
                                  Override to 'Picked'
                                </button>
                              </div>
                            ) : (
                              <span style={{ backgroundColor: '#EAFAF1', color: '#27AE60', border: '1px solid #27AE60', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {item.status}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExceptionScreen;