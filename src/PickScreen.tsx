import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, increment, query, where } from "firebase/firestore";
import { db } from "./firebase"; 
import { useIntegration } from "./IntegrationContext";

function PickScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  
  // Bring in our API event stream hook
  const { addEvent } = useIntegration();

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, "orders"), where("status", "==", "Pending"));
      const querySnapshot = await getDocs(q);
      const ordersArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersArray);
    } catch (error) {
      console.error("Error fetching orders: ", error);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateOrderStatus = async (order: any, currentItems: any[]) => {
    const allProcessed = currentItems.every(item => 
      item.status === "Picked" || item.status.includes("Exception")
    );
    
    if (allProcessed) {
      const anyException = currentItems.some(item => item.status.includes("Exception"));
      const finalStatus = anyException ? "Exception" : "Picked";
      await updateDoc(doc(db, "orders", order.id), { status: finalStatus });
    }
  };

  const handlePickItem = async (order: any, itemIndex: number) => {
    const updatedItems = [...order.items];
    const pickedItem = updatedItems[itemIndex];
    pickedItem.status = "Picked";
    
    await updateDoc(doc(db, "orders", order.id), { items: updatedItems });
    await updateDoc(doc(db, "products", pickedItem.sku), { stock: increment(-pickedItem.quantity) });
    
    // NEW: Fire the real-time API event for the inventory decrement
    addEvent("INVENTORY_DECREMENT", {
      orderId: order.orderId,
      sku: pickedItem.sku,
      itemName: pickedItem.name,
      quantityChange: -pickedItem.quantity,
      reasonCode: "SFS_PICK_COMPLETE",
      location: {
        storeId: "STR-042",
        nodeType: "RETAIL_STORE"
      },
      timestamp: new Date().toISOString()
    });

    await updateOrderStatus(order, updatedItems);
    fetchOrders();
  };

  const handleExceptionItem = async (order: any, itemIndex: number, reason: string) => {
    const updatedItems = [...order.items];
    const exceptionItem = updatedItems[itemIndex];
    exceptionItem.status = `Exception: ${reason}`;
    
    await updateDoc(doc(db, "orders", order.id), { items: updatedItems });
    
    // REMOVED THE addEvent BLOCK FROM HERE

    await updateOrderStatus(order, updatedItems);
    fetchOrders();
  };

  // Helper function to dynamically style the status pills
  const getItemStatusStyle = (status: string) => {
    const baseStyle = {
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 'bold',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      display: 'inline-block',
      marginTop: '6px'
    };

    if (status === "Picked") {
      return {
        ...baseStyle,
        backgroundColor: '#EAFAF1',
        color: '#27AE60',
        border: '1px solid #27AE60'
      };
    } else if (status.includes("Exception")) {
      return {
        ...baseStyle,
        backgroundColor: '#FDEDEC',
        color: '#E74C3C',
        border: '1px solid #E74C3C'
      };
    } else {
      // Pending
      return {
        ...baseStyle,
        backgroundColor: '#F1F5F9',
        color: '#475569',
        border: '1px solid #CBD5E1'
      };
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#E0E0E0' }}>Active Pick List</h1>
      
      {orders.length === 0 ? (
        <p style={{ color: '#A0A0A0' }}>No pending orders. Store is caught up!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ border: '1px solid #2C3E50', padding: '20px', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#2C3E50' }}>Order {order.orderId}</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  
                  <span style={{ 
                    backgroundColor: '#F1F5F9', 
                    color: '#475569', 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px' 
                  }}>
                    {order.status}
                  </span>

                </div>
              </div>
              
              <p style={{ fontSize: '14px', color: '#555', borderBottom: '1px solid #E0E0E0', paddingBottom: '15px', marginBottom: '15px' }}>
                <strong>Customer:</strong> {order.customer?.name}
              </p>
              
              <ul style={{ margin: '0', padding: '0', listStyle: 'none' }}>
                {order.items?.map((item: any, index: number) => (
                  <li key={index} style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '15px' }}>{item.quantity}x</strong> <span style={{ fontSize: '15px' }}>{item.name}</span>
                      <div>
                        {/* Dynamic Status Pill */}
                        <span style={getItemStatusStyle(item.status)}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    {item.status === "Pending" && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        
                        <button 
                          onClick={() => handlePickItem(order, index)} 
                          style={{ 
                            backgroundColor: '#EAFAF1', 
                            color: '#27AE60', 
                            border: '1px solid #27AE60', 
                            padding: '8px 16px', 
                            borderRadius: '6px', 
                            fontSize: '13px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Pick
                        </button>

                        <select 
                          onChange={(e) => handleExceptionItem(order, index, e.target.value)} 
                          style={{ 
                            backgroundColor: '#FDEDEC', 
                            color: '#E74C3C', 
                            border: '1px solid #E74C3C', 
                            padding: '8px 16px', 
                            borderRadius: '6px', 
                            fontSize: '13px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Exception</option>
                          <option value="Out of Stock">Out of Stock</option>
                          <option value="Damaged">Damaged</option>
                          <option value="Misplaced">Misplaced</option>
                        </select>

                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PickScreen;