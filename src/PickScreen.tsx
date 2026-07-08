import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, increment, query, where } from "firebase/firestore";
import { db } from "./firebase"; 
import { useIntegration } from "./IntegrationContext";

function PickScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<Record<string, number>>({}); // NEW: Holds live stock levels
  
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

  // NEW: Fetch live product inventory from Firebase
  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const stockData: Record<string, number> = {};
      querySnapshot.docs.forEach(doc => {
        stockData[doc.id] = doc.data().stock;
      });
      setInventory(stockData);
    } catch (error) {
      console.error("Error fetching inventory: ", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchInventory(); // Load inventory on page mount
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
    
    // NEW: Optimistic UI update. Instantly deduct from the screen without waiting for a full reload.
    setInventory(prev => ({
      ...prev,
      [pickedItem.sku]: (prev[pickedItem.sku] || pickedItem.quantity) - pickedItem.quantity
    }));

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
    await updateOrderStatus(order, updatedItems);
    fetchOrders();
  };

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
      return { ...baseStyle, backgroundColor: '#EAFAF1', color: '#27AE60', border: '1px solid #27AE60' };
    } else if (status.includes("Exception")) {
      return { ...baseStyle, backgroundColor: '#FDEDEC', color: '#E74C3C', border: '1px solid #E74C3C' };
    } else {
      return { ...baseStyle, backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' };
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '850px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#E0E0E0', textAlign: 'center' }}>Active Pick List</h1>
      
      {orders.length === 0 ? (
        <div style={{ backgroundColor: '#131E3A', padding: '40px', borderRadius: '12px', textAlign: 'center', border: '1px solid #2C3E50' }}>
          <p style={{ color: '#A0A0A0', fontSize: '16px', margin: 0 }}>No pending orders. Store is caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ border: '1px solid #EAECEE', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              
              {/* Card Header */}
              <div style={{ padding: '25px 25px 0 25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '20px', color: '#2C3E50', fontWeight: 'bold' }}>Order {order.orderId}</h3>
                  <span style={{ 
                    backgroundColor: '#F8F9FA', 
                    color: '#6C757D', 
                    padding: '6px 14px', 
                    borderRadius: '20px', 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px' 
                  }}>
                    {order.status}
                  </span>
                </div>
                
                <div style={{ textAlign: 'center', paddingBottom: '20px', borderBottom: '1px solid #EAECEE' }}>
                  <span style={{ fontSize: '14px', color: '#7F8C8D', fontWeight: 'bold' }}>Customer:</span> <span style={{ fontSize: '14px', color: '#2C3E50' }}>{order.customer?.name}</span>
                </div>
              </div>
              
              {/* Item Manifest */}
              <ul style={{ margin: '0', padding: '0 25px 25px 25px', listStyle: 'none' }}>
                {order.items?.map((item: any, index: number) => {
                  
                  // CHANGED: Pull the live stock directly from the database state instead of making it up
                  const currentStock = inventory[item.sku] !== undefined ? inventory[item.sku] : '--';
                  
                  const mockAisle = (item.sku?.charCodeAt(0) % 12) + 1 || 4;
                  const mockBin = `${item.name?.charAt(0).toUpperCase() || 'B'}${(item.quantity * 7) % 20 + 1}`;
                  
                  return (
                    <li key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      padding: '25px 0', 
                      borderBottom: index !== order.items.length - 1 ? '1px solid #EAECEE' : 'none',
                      gap: '20px'
                    }}>
                      
                      {/* Product Image */}
                      <div style={{
                        width: '75px', height: '75px', 
                        borderRadius: '8px', border: '1px solid #EAECEE',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        overflow: 'hidden', flexShrink: 0, backgroundColor: '#F8F9FA'
                      }}>
                        <img 
                          src={`/images/${item.sku}.png`}
                          alt={item.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://placehold.co/100x100/F8F9FA/6C757D?text=${item.name.charAt(0).toUpperCase()}`;
                          }}
                        />
                      </div>

                      {/* Product Name & Status */}
                      <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start', overflow: 'hidden' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Item Details</span>
                        <div style={{ fontSize: '13px', color: '#2C3E50', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'left' }}>
                          <strong style={{ marginRight: '4px' }}>{item.quantity}x</strong> {item.name}
                        </div>
                        <span style={getItemStatusStyle(item.status)}>
                          {item.status}
                        </span>
                      </div>

                      {/* On Hand Metric */}
                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>On Hand</span>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1A1A1A', textAlign: 'left' }}>
                          {currentStock}
                        </span>
                      </div>

                      {/* Location Metric */}
                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Location</span>
                        <span style={{ fontSize: '13px', color: '#2C3E50', textAlign: 'left' }}>Aisle <strong>{mockAisle}</strong></span>
                        <span style={{ fontSize: '13px', color: '#2C3E50', textAlign: 'left' }}>Bin <strong>{mockBin}</strong></span>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0, marginTop: '16px' }}>
                        {item.status === "Pending" && (
                          <>
                            <button 
                              onClick={() => handlePickItem(order, index)} 
                              style={{ 
                                backgroundColor: 'transparent', 
                                color: '#27AE60', 
                                border: '1px solid #27AE60', 
                                padding: '8px 20px', 
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
                                backgroundColor: 'transparent', 
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
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default PickScreen;