import { useNavigate } from "react-router-dom";
import { collection, doc, setDoc, getDocs, writeBatch, addDoc, query, where } from "firebase/firestore";
import { db } from "./firebase";

function AdminScreen() {
  const navigate = useNavigate();
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
      const isBopis = Math.random() > 0.5;
      await addDoc(collection(db, "orders"), {
        orderId: "ORD-" + Math.floor(Math.random() * 9000 + 1000),
        status: "Pending",
        orderType: isBopis ? "BOPIS" : "SFS", 
        shippingSpeed: isBopis ? null : "Priority", 
        orderDate: new Date().toISOString(),
        customer: { name: "Demo User", address: "999 Test Blvd", city: "Dallas", state: "TX", zip: "75001" },
        items: [
          { sku: "SKU-1001", name: "Premium Cotton T-Shirt - White", quantity: 1, status: "Pending" },
          { sku: "SKU-1001", name: "Premium Cotton T-Shirt - White", quantity: 1, status: "Pending" },
          { sku: "SKU-1005", name: "Canvas Tote Bag - Natural", quantity: 1, status: "Pending" }
        ]
      });
      alert("Success! Fast-track dummy order sent to the Pick Screen."); 
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Failed to create dummy order.");
    }
  };

  const clearPendingOrders = async () => {
    if (!window.confirm("Are you sure you want to delete only the PENDING orders? This will clear active queues but keep history intact.")) return;
    
    try {
      const batch = writeBatch(db);
      // Query specifically for Pending status
      const q = query(collection(db, "orders"), where("status", "==", "Pending"));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert("No pending orders found.");
        return;
      }

      querySnapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      alert(`Cleared ${querySnapshot.size} pending order(s).`);
    } catch (error) {
      console.error("Error clearing pending orders: ", error);
      alert("Failed to clear pending orders.");
    }
  };

  const clearAllOrders = async () => {
    if (!window.confirm("Are you sure you want to delete ALL orders? This cannot be undone.")) return;
    
    try {
      const batch = writeBatch(db);
      const querySnapshot = await getDocs(collection(db, "orders"));
      querySnapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      alert("All orders cleared.");
    } catch (error) {
      console.error("Error clearing orders: ", error);
      alert("Failed to clear orders.");
    }
  };

  const seedUsers = async () => {
    const users = [
      { username: "jeagles", pin: "5678", role: "manager", name: "John Eagles (Manager)" },
      { username: "rgrogman", pin: "1234", role: "associate", name: "Ryan Grogman (Associate)" }
    ];

    try {
      for (const u of users) {
        // We use the username as the actual Document ID for super fast lookups
        await setDoc(doc(db, "users", u.username), u);
      }
      alert("Success! Manager (5678) and Associate (1234) accounts created.");
    } catch (error) {
      console.error("Error seeding users: ", error);
      alert("Failed to create users.");
    }
  };
// Uniform button styling to match your screenshot
  const adminButtonStyle = {
    padding: '15px',
    backgroundColor: '#6C7A89', // Slate gray
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    width: '100%', // This forces the button to fill the grid cell completely
    transition: 'background-color 0.2s'
  };
  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Demo Admin Controls</h1>
      
      <div style={{ backgroundColor: '#131E3A', padding: '30px', borderRadius: '12px', border: '1px solid #2C3E50' }}>
    
        <p style={{ color: '#A0A0A0', fontSize: '14px', marginBottom: '20px' }}>
          Use these tools to reset the demo environment before a presentation.
        </p>
        
        {/* Uniform Grid Container for Admin Controls */}
      <div style={{ 
        display: 'grid', 
        /* 1 column on mobile, 3 equal columns on desktop */
        gridTemplateColumns: window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', 
        gap: '20px',
        maxWidth: '900px',
        margin: '0 auto' 
      }}>
        
        {/* Make sure to re-attach your specific onClick functions to these buttons! */}
        <button onClick={seedUsers} style={adminButtonStyle}>
          Seed Demo Users
        </button>
        
        <button onClick={seedInventory}  style={adminButtonStyle}>
          Reset DB Inventory
        </button>
        
        <button onClick={() => navigate('/ecomsim')} style={adminButtonStyle}>
          E-Com Order Simulator
        </button>
        
        <button onClick={createDummyOrder} style={adminButtonStyle}>
          + Quick Dummy Order
        </button>
        
        <button onClick={clearPendingOrders} style={adminButtonStyle}>
          Clear Pending Orders
        </button>
        
        <button onClick={clearAllOrders} style={adminButtonStyle}>
          Clear All Orders
        </button>
      </div>
      </div>
    </div>
  );
}

export default AdminScreen;