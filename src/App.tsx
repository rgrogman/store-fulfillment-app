import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, doc, setDoc, updateDoc, increment, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase"; 

function App() {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "orders"));
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

  const seedInventory = async () => {
    const catalog = [
      { sku: "SKU-1001", name: "Premium Cotton T-Shirt - White", stock: 45, category: "Apparel" },
      { sku: "SKU-1002", name: "Premium Cotton T-Shirt - Black", stock: 30, category: "Apparel" },
      { sku: "SKU-1003", name: "Vintage Denim Jacket", stock: 12, category: "Apparel" },
      { sku: "SKU-1004", name: "Slim Fit Chinos - Khaki", stock: 25, category: "Apparel" },
      { sku: "SKU-1005", name: "Canvas Tote Bag - Natural", stock: 50, category: "Accessories" },
      { sku: "SKU-1006", name: "Leather Crossbody Bag", stock: 8, category: "Accessories" },
      { sku: "SKU-1007", name: "Classic Aviator Sunglasses", stock: 15, category: "Accessories" },
      { sku: "SKU-1008", name: "Ribbed Knit Beanie - Charcoal", stock: 40, category: "Accessories" },
      { sku: "SKU-1009", name: "Performance Running Socks (3-Pack)", stock: 60, category: "Apparel" },
      { sku: "SKU-1010", name: "Waterproof Hiking Boots", stock: 10, category: "Footwear" },
      { sku: "SKU-1011", name: "Minimalist Leather Sneakers", stock: 22, category: "Footwear" },
      { sku: "SKU-1012", name: "Stainless Steel Water Bottle", stock: 35, category: "Home" },
      { sku: "SKU-1013", name: "Ceramic Coffee Mug", stock: 40, category: "Home" },
      { sku: "SKU-1014", name: "Organic Cotton Bath Towel", stock: 18, category: "Home" },
      { sku: "SKU-1015", name: "Yoga Mat - Extra Thick", stock: 20, category: "Fitness" },
      { sku: "SKU-1016", name: "Resistance Band Set", stock: 30, category: "Fitness" },
      { sku: "SKU-1017", name: "Wireless Noise-Canceling Headphones", stock: 5, category: "Electronics" },
      { sku: "SKU-1018", name: "Portable Power Bank", stock: 25, category: "Electronics" },
      { sku: "SKU-1019", name: "Smart Fitness Watch", stock: 14, category: "Electronics" },
      { sku: "SKU-1020", name: "Travel Tech Organizer", stock: 45, category: "Accessories" }
    ];

    try {
      for (const item of catalog) {
        await setDoc(doc(db, "products", item.sku), item);
      }
      alert("Success! 20 items have been uploaded to the master inventory.");
    } catch (error) {
      console.error("Error seeding inventory: ", error);
      alert("Failed to upload inventory.");
    }
  };

  const createDummyOrder = async () => {
    try {
      await addDoc(collection(db, "orders"), {
        orderId: "ORD-" + Math.floor(Math.random() * 9000 + 1000),
        status: "Pending",
        orderType: Math.random() > 0.5 ? "BOPIS" : "SFS", 
        orderDate: new Date().toISOString(),
        customer: { name: "Jane Doe", city: "Dallas", state: "TX" },
        items: [
          { sku: "SKU-1001", name: "Premium Cotton T-Shirt - White", quantity: 2, status: "Pending" },
          { sku: "SKU-1005", name: "Canvas Tote Bag - Natural", quantity: 1, status: "Pending" }
        ]
      });
      fetchOrders(); 
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm("Are you sure you want to delete ALL orders? This cannot be undone.")) return;
    
    try {
      const batch = writeBatch(db);
      const querySnapshot = await getDocs(collection(db, "orders"));
      querySnapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      fetchOrders();
      alert("All orders cleared.");
    } catch (error) {
      console.error("Error clearing orders: ", error);
      alert("Failed to clear orders.");
    }
  };

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
    <div style={{ backgroundColor: '#0A1128', minHeight: '100vh', padding: '40px 20px', fontFamily: 'sans-serif', color: '#E0E0E0' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #2C3E50', paddingBottom: '15px', marginBottom: '30px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>RCP Store Fulfillment</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={seedInventory} style={{ padding: '10px 20px', backgroundColor: 'darkred', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Seed DB Inventory</button>
            <button onClick={createDummyOrder} style={{ padding: '10px 20px', backgroundColor: '#A0A0A0', color: '#1A1A1A', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ New Order</button>
          <button onClick={clearAllOrders} style={{ padding: '10px 20px', backgroundColor: '#5D6D7E', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Reset All</button>
          </div>
        </div>
        
        <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Active Pick List</h2>
        
        {orders.length === 0 ? (
          <p style={{ color: '#A0A0A0' }}>No pending orders. Store is caught up!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.map((order) => (
              <div key={order.id} style={{ border: '1px solid #E0E0E0', padding: '20px', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px' }}>Order {order.orderId}</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ 
                      backgroundColor: order.status === 'Pending' ? '#FF5722' : order.status === 'Picked' ? '#27AE60' : '#C0392B', 
                      color: '#FFFFFF', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' 
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
    <button 
      onClick={() => handlePickItem(order, index)} 
      style={{ backgroundColor: '#27AE60', color: 'white', border: 'none', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
    >
      Pick
    </button>

    <select 
      onChange={(e) => handleExceptionItem(order, index, e.target.value)} 
      style={{ padding: '2px', fontSize: '11px', cursor: 'pointer', backgroundColor: '#C0392B', color: 'white', border: 'none', borderRadius: '4px' }}
      defaultValue=""
    >
      <option value="" disabled>X</option>
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
    </div>
  )
}

export default App;