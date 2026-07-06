import { useIntegration } from "./IntegrationContext";
import { useState, useEffect } from "react";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const DEMO_CUSTOMERS = [
  { id: "C1", firstName: "Jane", lastName: "Doe", address1: "123 Main St", address2: "Apt 4B", city: "Dallas", state: "TX", zip: "75201" },
  { id: "C2", firstName: "John", lastName: "Smith", address1: "456 Oak Rd", address2: "", city: "Austin", state: "TX", zip: "78701" },
  { id: "C3", firstName: "Alice", lastName: "Johnson", address1: "789 Pine Ln", address2: "Suite 100", city: "Chicago", state: "IL", zip: "60601" },
  { id: "C4", firstName: "Bob", lastName: "Williams", address1: "321 Maple Dr", address2: "", city: "New York", state: "NY", zip: "10001" },
  { id: "C5", firstName: "Sarah", lastName: "Connor", address1: "654 Elm St", address2: "Unit 2", city: "Los Angeles", state: "CA", zip: "90001" }
];

function EcomSimulator() {
  const [products, setProducts] = useState<any[]>([]);
  
  // Form State
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(0);
  const [orderType, setOrderType] = useState("SFS");
  const [shippingSpeed, setShippingSpeed] = useState("Standard");
  const [platform, setPlatform] = useState("Shopify"); // NEW: Platform State
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cart, setCart] = useState<any[]>([]);
  
  const { addEvent } = useIntegration();
  const activeCustomer = DEMO_CUSTOMERS[selectedCustomerIndex];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "products"));
        const productsArray = querySnapshot.docs.map(doc => ({
          sku: doc.id,
          ...doc.data()
        }));
        setProducts(productsArray);
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
      const newItems = Array.from({ length: quantity }, () => ({
        sku: product.sku, 
        name: product.name, 
        quantity: 1, 
        status: "Pending",
        price: product.price || 29.99 // Fallback price for realistic JSON
      }));
      setCart([...cart, ...newItems]);
      setQuantity(1); 
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

    const fullName = `${activeCustomer.firstName} ${activeCustomer.lastName}`;
    const newOrderId = "ORD-" + Math.floor(Math.random() * 9000 + 1000);
    const timestamp = new Date().toISOString();

    try {
      // 1. Save standardized format to our Firebase DB so the UI works perfectly
      await addDoc(collection(db, "orders"), {
        orderId: newOrderId, 
        status: "Pending",
        orderType: orderType,
        shippingSpeed: orderType === "BOPIS" ? null : shippingSpeed, 
        orderDate: timestamp,
        customer: { 
          name: fullName, 
          address: activeCustomer.address1,
          city: activeCustomer.city, 
          state: activeCustomer.state,
          zip: activeCustomer.zip
        },
        items: cart
      });
      
      // 2. Generate the Platform-Specific Mock Payload
      let platformPayload = {};

      if (platform === "Shopify") {
        platformPayload = {
          id: Math.floor(Math.random() * 10000000000),
          name: `#${newOrderId}`,
          financial_status: "paid",
          fulfillment_status: null,
          created_at: timestamp,
          source_name: "web",
          tags: orderType === "BOPIS" ? "bopis, store-pickup" : "sfs",
          shipping_address: {
            first_name: activeCustomer.firstName,
            last_name: activeCustomer.lastName,
            address1: activeCustomer.address1,
            address2: activeCustomer.address2,
            city: activeCustomer.city,
            province_code: activeCustomer.state,
            zip: activeCustomer.zip
          },
          line_items: cart.map(item => ({
            sku: item.sku,
            title: item.name,
            quantity: item.quantity,
            price: item.price
          }))
        };
      } else if (platform === "Magento") {
        platformPayload = {
          entity_id: Math.floor(Math.random() * 100000),
          increment_id: newOrderId,
          state: "processing",
          status: "processing",
          store_id: 1,
          created_at: timestamp.replace('T', ' ').substring(0, 19), // Magento uses SQL datetime
          items: cart.map((item, index) => ({
            item_id: index + 100,
            sku: item.sku,
            name: item.name,
            qty_ordered: item.quantity,
            price: item.price
          })),
          extension_attributes: {
            shipping_assignments: [{
              shipping: {
                address: {
                  firstname: activeCustomer.firstName,
                  lastname: activeCustomer.lastName,
                  street: [activeCustomer.address1, activeCustomer.address2].filter(Boolean),
                  city: activeCustomer.city,
                  region: activeCustomer.state,
                  postcode: activeCustomer.zip
                },
                method: orderType === "BOPIS" ? "instore_pickup" : `flatrate_${shippingSpeed.toLowerCase()}`
              }
            }]
          }
        };
      } else if (platform === "BigCommerce") {
        platformPayload = {
          id: Math.floor(Math.random() * 10000),
          custom_status: "Awaiting Fulfillment",
          status_id: 11, 
          date_created: timestamp,
          billing_address: {
            first_name: activeCustomer.firstName,
            last_name: activeCustomer.lastName,
            street_1: activeCustomer.address1,
            city: activeCustomer.city,
            state: activeCustomer.state,
            zip: activeCustomer.zip
          },
          // BigCommerce typically requires a sub-request for products, but we inline them for the demo
          products: cart.map(item => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            base_price: item.price
          }))
        };
      }

      // 3. Fire the tailored payload to the Integration Stream
      addEvent("INBOUND_ORDER_ROUTING", {
        source_platform: platform,
        raw_payload: platformPayload
      });

      alert(`Success! ${platform} order placed for ${fullName}. Check the Pick Screen.`);
      setCart([]); 
    } catch (error) {
      console.error("Error creating order: ", error);
      alert("Failed to submit order.");
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #2C3E50',
    backgroundColor: '#131E3A',
    color: '#E0E0E0',
    fontSize: '14px',
    boxSizing: 'border-box' as const
  };

  const readOnlyStyle = {
    ...inputStyle,
    backgroundColor: '#111827',
    color: '#6B7280',
    border: '1px solid #1F2937',
    cursor: 'not-allowed'
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '850px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', marginBottom: '30px', color: '#E0E0E0' }}>
        Demo Digital Storefront
      </h1>
      
      <div style={{ 
        backgroundColor: '#1A2235', 
        border: '1px solid #2C3E50', 
        padding: '30px', 
        borderRadius: '12px', 
        marginBottom: '30px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
      }}>
        
        {/* Row 1: Profile, Platform & Fulfillment */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid #2C3E50' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', fontSize: '12px', color: '#A0A0A0', textTransform: 'uppercase' }}>Test Profile</label>
            <select 
              value={selectedCustomerIndex} 
              onChange={(e) => setSelectedCustomerIndex(Number(e.target.value))}
              style={inputStyle}
            >
              {DEMO_CUSTOMERS.map((cust, index) => (
                <option key={cust.id} value={index}>{cust.firstName} {cust.lastName}</option>
              ))}
            </select>
          </div>

          {/* NEW: Platform Selector */}
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', fontSize: '12px', color: '#3498DB', textTransform: 'uppercase' }}>E-Com Platform</label>
            <select 
              value={platform} 
              onChange={(e) => setPlatform(e.target.value)}
              style={{ ...inputStyle, border: '1px solid #3498DB' }}
            >
              <option value="Shopify">Shopify</option>
              <option value="Magento">Adobe Commerce (Magento)</option>
              <option value="BigCommerce">BigCommerce</option>
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', fontSize: '12px', color: '#A0A0A0', textTransform: 'uppercase' }}>Fulfillment</label>
            <select 
              value={orderType} 
              onChange={(e) => setOrderType(e.target.value)}
              style={inputStyle}
            >
              <option value="SFS">Ship From Store (SFS)</option>
              <option value="BOPIS">Store Pickup (BOPIS)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', fontSize: '12px', color: orderType === "BOPIS" ? '#4B5563' : '#A0A0A0', textTransform: 'uppercase' }}>Speed</label>
           <select 
              value={shippingSpeed} 
              onChange={(e) => setShippingSpeed(e.target.value)}
              disabled={orderType === "BOPIS"}
              style={orderType === "BOPIS" ? readOnlyStyle : inputStyle}
            >
              <option value="Standard">Standard (3-5 Days)</option>
              <option value="Priority">Priority (2-Day)</option>
              <option value="Overnight">Overnight (Next Day)</option>
            </select>
          </div>
        </div>

        {/* Row 2: The Realistic Checkout Form (Auto-populated & Read Only) */}
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#E0E0E0', fontSize: '16px' }}>Shipping Address</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>First Name</label>
              <input type="text" value={activeCustomer.firstName} readOnly style={readOnlyStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>Last Name</label>
              <input type="text" value={activeCustomer.lastName} readOnly style={readOnlyStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>Address Line 1</label>
              <input type="text" value={activeCustomer.address1} readOnly style={readOnlyStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>Address Line 2</label>
              <input type="text" value={activeCustomer.address2} readOnly style={readOnlyStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>City</label>
              <input type="text" value={activeCustomer.city} readOnly style={readOnlyStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>State</label>
              <input type="text" value={activeCustomer.state} readOnly style={readOnlyStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6B7280', marginBottom: '5px' }}>ZIP Code</label>
              <input type="text" value={activeCustomer.zip} readOnly style={readOnlyStyle} />
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', paddingTop: '25px', borderTop: '1px solid #2C3E50' }}>
          <div style={{ flexGrow: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', fontSize: '13px', color: '#A0A0A0', textTransform: 'uppercase' }}>Add Item to Cart</label>
            <select 
              value={selectedSku} 
              onChange={(e) => setSelectedSku(e.target.value)}
              style={inputStyle}
            >
              {products.map(product => (
                <option key={product.sku} value={product.sku}>
                  {product.name} (Stock: {product.stock})
                </option>
              ))}
            </select>
          </div>
          <div style={{ width: '90px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '10px', fontSize: '13px', color: '#A0A0A0', textAlign: 'center', textTransform: 'uppercase' }}>Qty</label>
            <input 
              type="number" 
              min="1" 
              value={quantity} 
              onChange={(e) => setQuantity(Number(e.target.value))}
              style={{ ...inputStyle, textAlign: 'center' }}
            />
          </div>
          <button 
            onClick={handleAddToCart}
            style={{ padding: '0 24px', backgroundColor: '#8E44AD', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', height: '42px', transition: 'background-color 0.2s' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Cart Overview */}
      <div style={{ 
        backgroundColor: '#1A2235', 
        border: '1px solid #2C3E50', 
        padding: '30px', 
        borderRadius: '12px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #2C3E50', paddingBottom: '15px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#E0E0E0' }}>Order Summary</h3>
          <span style={{ backgroundColor: '#8E44AD', color: '#FFFFFF', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
            {cart.length} Item(s)
          </span>
        </div>
        
        {cart.length === 0 ? (
          <div style={{ backgroundColor: '#131E3A', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '1px solid #1F2937' }}>
            <p style={{ color: '#6B7280', fontStyle: 'italic', margin: 0, fontSize: '14px' }}>Shopping cart is currently empty.</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 25px 0' }}>
            {cart.map((item, index) => (
              <li key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '15px 20px', 
                backgroundColor: '#131E3A', 
                borderRadius: '8px', 
                marginBottom: '10px', 
                border: '1px solid #2C3E50'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#E0E0E0' }}>
                  <strong style={{ color: '#8E44AD', marginRight: '10px' }}>{item.quantity}x</strong> 
                  {item.name}
                </span>
                <button 
                  onClick={() => removeCartItem(index)}
                  style={{ background: 'none', border: '1px solid #E74C3C', color: '#E74C3C', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', transition: 'all 0.2s' }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #2C3E50' }}>
          <button 
            onClick={handleSubmitOrder}
            disabled={cart.length === 0}
            style={{ 
              padding: '14px 28px', 
              backgroundColor: cart.length === 0 ? '#4B5563' : '#27AE60', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer', 
              fontWeight: 'bold',
              fontSize: '15px',
              transition: 'all 0.2s'
            }}
          >
            Inject Digital Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default EcomSimulator;