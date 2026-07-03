import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, increment, query, where } from "firebase/firestore";
import { db } from "./firebase"; 

function PickScreen() {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    try {
      // We apply a strict filter so only "Pending" orders populate this active queue
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
    // Check if every item is either "Picked" or starts with "Exception"
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
    updatedItems[itemIndex].status = "Picked";
    
    await updateDoc(doc(db, "orders", order.id), { items: updatedItems });
    // Decrement inventory immediately upon successful physical pick
    await updateDoc(doc(db, "products", updatedItems[itemIndex].sku), { stock: increment(-updatedItems[itemIndex].quantity) });
    
    await updateOrderStatus(order, updatedItems); // Check order completion
    fetchOrders();
  };

  const handleExceptionItem = async (order: any, itemIndex: number, reason: string) => {
    const updatedItems = [...order.items];
    updatedItems[itemIndex].status = `Exception: ${reason}`;
    
    await updateDoc(doc(db, "orders", order.id), { items: updatedItems });
    
    await updateOrderStatus(order, updatedItems); // Check order completion
    fetchOrders();
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Active Pick List</h1>
      
      {orders.length === 0 ? (
        <p style={{ color: '#A0A0A0' }}>No pending orders. Store is caught up!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ border: '1px solid #E0E0E0', padding: '20px', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>Order {order.orderId}</h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  
                  {/* UPDATED: Soft Slate Badge */}
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
              
              <p style={{ fontSize: '14px', color: '#555' }}><strong>Customer:</strong> {order.customer?.name}</p>
              <ul style={{ margin: '10px 0', paddingLeft: '20px', fontSize: '15px' }}>
                {order.items?.map((item: any, index: number) => (
                  <li key={index} style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{item.quantity}x</strong> {item.name} 
                      <div style={{ fontSize: '11px', color: item.status?.includes('Exception') ? '#C0392B' : '#888' }}>
                        Status: {item.status}
                      </div>
                    </div>
                    {item.status === "Pending" && (
                      <div style={{ display: 'flex', gap: '5px' }}>
                        
                        {/* UPDATED: Tonal Green Pick Button */}
                        <button 
                          onClick={() => handlePickItem(order, index)} 
                          style={{ 
                            backgroundColor: '#EAFAF1', 
                            color: '#27AE60', 
                            border: '1px solid #27AE60', 
                            padding: '6px 16px', 
                            borderRadius: '6px', 
                            fontSize: '13px', 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          Pick
                        </button>

                        {/* UPDATED: Tonal Red Exception Dropdown */}
                        <select 
                          onChange={(e) => handleExceptionItem(order, index, e.target.value)} 
                          style={{ 
                            backgroundColor: '#FDEDEC', 
                            color: '#E74C3C', 
                            border: '1px solid #E74C3C', 
                            padding: '6px 16px', 
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