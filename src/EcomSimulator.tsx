import { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// 5 Dummy Customers for Demo Purposes
const DEMO_CUSTOMERS = [
  { id: "C1", name: "Jane Doe", address: "123 Main St", city: "Dallas", state: "TX", zip: "75201" },
  { id: "C2", name: "John Smith", address: "456 Oak Rd", city: "Austin", state: "TX", zip: "78701" },
  { id: "C3", name: "Alice Johnson", address: "789 Pine Ln", city: "Chicago", state: "IL", zip: "60601" },
  { id: "C4", name: "Bob Williams", address: "321 Maple Dr", city: "New York", state: "NY", zip: "10001" },
  { id: "C5", name: "Sarah Connor", address: "654 Elm St", city: "Los Angeles", state: "CA", zip: "90001" }
];

function EcomSimulator() {
  const [products, setProducts] = useState<any[]>([]);
  
  // Form State
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(0);
  const [orderType, setOrderType] = useState("SFS");
  const [shippingSpeed, setShippingSpeed] = useState("Standard");
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<any[]>([]);

  // Fetch real inventory from Firebase to populate the dropdown
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsArray = querySnapshot.docs.map(doc => ({
          sku: doc.id,
          ...doc.data()
        }));
        setProducts(productsArray);
        // Default to the first product if available
        if (productsArray.length > 0) {
          setSelectedSku(productsArray[0].sku);
        }
      } catch (error) {
        console.error("Error fetching products: ", error);
      }
    };
    fetchProducts();
  }, []);

  const handleAddToCart = () => {
    const product = products.find(p => p.sku === selectedSku);
    if (product) {
      // Create an array of individual items based on the selected quantity
      const newItems = Array.from({ length: quantity }, () => ({
        sku: product.sku, 
        name: product.name, 
        quantity: 1, // Hardcoded to 1 so each item is an individual line
        status: "Pending"
      }));
      
      setCart([...cart, ...newItems]);
      setQuantity(1); // Reset form
    }
  };

  const removeCartItem = (indexToRemove: number) => {
    setCart(cart.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert("Please add items to the cart before submitting.");
      return;
    }

    const customer = DEMO_CUSTOMERS[selectedCustomerIndex];

    try {
      await addDoc(collection(db, "orders"), {
        orderId: "ORD-" + Math.floor(Math.random() * 9000 + 1000),
        status: "Pending",
        orderType: orderType,
        // NEW: Save the shipping speed (or null if BOPIS)
        shippingSpeed: orderType === "BOPIS" ? null : shippingSpeed, 
        orderDate: new Date().toISOString(),
        customer: { 
          name: customer.name, 
          address: customer.address,
          city: customer.city, 
          state: customer.state,
          zip: customer.zip
        },
        items: cart
      });
      
      alert(`Success! Order placed for ${customer.name}. Check the Pick Screen.`);
      setCart([]); 
    } catch (error) {
      console.error("Error creating order: ", error);
      alert("Failed to submit order.");
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Demo Digital Storefront</h1>
      
      <div style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A', padding: '20px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        
        {/* Customer & Fulfillment Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #E0E0E0' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Select Customer</label>
            <select 
              value={selectedCustomerIndex} 
              onChange={(e) => setSelectedCustomerIndex(Number(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CCC' }}
            >
              {DEMO_CUSTOMERS.map((cust, index) => (
                <option key={cust.id} value={index}>{cust.name} ({cust.city}, {cust.state})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Fulfillment Method</label>
            <select 
              value={orderType} 
              onChange={(e) => setOrderType(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CCC' }}
            >
              <option value="SFS">Ship From Store (SFS)</option>
              <option value="BOPIS">Buy Online, Pick Up In Store (BOPIS)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px', color: orderType === "BOPIS" ? '#CCC' : '#1A1A1A' }}>Shipping Speed</label>
           <select 
  value={shippingSpeed} 
  onChange={(e) => setShippingSpeed(e.target.value)}
  disabled={orderType === "BOPIS"}
  style={{ 
    width: '100%', 
    padding: '10px', 
    borderRadius: '6px', 
    border: '1px solid #CCC', 
    backgroundColor: orderType === "BOPIS" ? '#F8F9FA' : 'white',
    color: '#1A1A1A' /* <-- THIS FIXES THE INVISIBLE TEXT */
  }}
>
  <option value="Standard">Standard (3-5 Days)</option>
  <option value="Priority">Priority (2-Day)</option>
  <option value="Overnight">Overnight (Next Day)</option>
</select>
          </div>
        </div>

        {/* Product Selection */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
          <div style={{ flexGrow: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Add Item to Cart</label>
            <select 
              value={selectedSku} 
              onChange={(e) => setSelectedSku(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CCC' }}
            >
              {products.map(product => (
                <option key={product.sku} value={product.sku}>
                  {product.name} (Stock: {product.stock})
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: '80px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Qty</label>
            <input 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #CCC', boxSizing: 'border-box' }}
            />
          </div>
          <button 
            onClick={handleAddToCart}
            style={{ padding: '10px 20px', backgroundColor: '#2C3E50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', height: '40px' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Cart Overview */}
      <div style={{ backgroundColor: '#F8F9FA', color: '#1A1A1A', padding: '20px', borderRadius: '12px', border: '1px solid #E0E0E0' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Shopping Cart</h3>
        
        {cart.length === 0 ? (
          <p style={{ color: '#888', fontStyle: 'italic', margin: 0 }}>Cart is empty.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
            {cart.map((item, index) => (
              <li key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #E0E0E0' }}>
                <span><strong>{item.quantity}x</strong> {item.name}</span>
                <button 
                  onClick={() => removeCartItem(index)}
                  style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
          <div style={{ fontSize: '14px', color: '#555' }}>
            <strong>Shipping to:</strong> {DEMO_CUSTOMERS[selectedCustomerIndex].address}, {DEMO_CUSTOMERS[selectedCustomerIndex].city}
          </div>
          <button 
            onClick={handleSubmitOrder}
            disabled={cart.length === 0}
            style={{ 
              padding: '12px 24px', 
              backgroundColor: cart.length === 0 ? '#A0A0A0' : '#27AE60', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            Submit Order
          </button>
        </div>
      </div>

    </div>
  );
}

export default EcomSimulator;