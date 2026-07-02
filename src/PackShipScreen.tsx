import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

// Upgraded Order Card with Box Routing, Label Modal, and 3-Step Verification
const OrderCard = ({ order, isSfs, onProcess }: { order: any, isSfs: boolean, onProcess: (id: string) => void }) => {
  const [selectedBox, setSelectedBox] = useState("");
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isLabelPrinted, setIsLabelPrinted] = useState(false); // NEW: Tracks intermediate print state

  // Determine badge color based on urgency
  const getSpeedColor = (speed: string) => {
    if (speed === "Overnight") return "#C0392B"; // Red
    if (speed === "Priority") return "#D35400";  // Orange
    return "#7F8C8D";                            // Gray
  };

  const handleGenerateLabelClick = () => {
    setShowLabelModal(true);
  };

  const handlePrintAction = () => {
    setShowLabelModal(false);
    setIsLabelPrinted(true); // Move to Step 3 instead of completing
  };

  const handleFinalHandoff = () => {
    onProcess(order.id); // Final database update
  };

  // Generates a random realistic-looking tracking number
  const mockTrackingNumber = "1Z" + Math.random().toString(36).substring(2, 10).toUpperCase();

  return (
    <>
      <div style={{ border: '1px solid #E0E0E0', padding: '20px', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px' }}>Order {order.orderId}</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}><strong>Customer:</strong> {order.customer?.name}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
            <span style={{ backgroundColor: '#27AE60', color: '#FFFFFF', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {order.status}
            </span>
            {isSfs && order.shippingSpeed && (
              <span style={{ backgroundColor: getSpeedColor(order.shippingSpeed), color: '#FFFFFF', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                {order.shippingSpeed}
              </span>
            )}
          </div>
        </div>
        
        <div style={{ backgroundColor: '#F8F9FA', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '14px' }}>
          <strong>Pack Verification:</strong>
          <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
            {order.items?.map((item: any, index: number) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {item.quantity}x {item.name}
              </li>
            ))}
          </ul>
        </div>

        {/* The Interactive Packing Workflow */}
        {isSfs ? (
          <div style={{ borderTop: '1px solid #E0E0E0', paddingTop: '15px', marginTop: '15px' }}>
            {!isLabelPrinted ? (
              // STEPS 1 & 2: Box Selection and Label Generation
              <>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
                  1. Select Packing Material
                </label>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  {["Polybag", "Small Box", "Medium Box", "Large Box"].map(box => (
                    <button
                      key={box}
                      onClick={() => setSelectedBox(box)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: selectedBox === box ? '2px solid #2980B9' : '1px solid #CCC',
                        backgroundColor: selectedBox === box ? '#EAF2F8' : '#FFF',
                        color: selectedBox === box ? '#2980B9' : '#1A1A1A',
                        cursor: 'pointer',
                        fontWeight: selectedBox === box ? 'bold' : 'normal'
                      }}
                    >
                      {box}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={handleGenerateLabelClick} 
                  disabled={!selectedBox}
                  style={{ 
                    backgroundColor: selectedBox ? '#2980B9' : '#A0A0A0', 
                    color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', 
                    cursor: selectedBox ? 'pointer' : 'not-allowed', 
                    fontWeight: 'bold', width: '100%' 
                  }}
                >
                  2. Generate Carrier Label
                </button>
              </>
            ) : (
              // STEP 3: Physical Handoff Confirmation
              <div style={{ backgroundColor: '#EAF2F8', padding: '15px', borderRadius: '6px', border: '1px solid #2980B9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                  <span style={{ fontSize: '20px' }}>✅</span>
                  <div>
                    <strong style={{ display: 'block', color: '#2980B9', fontSize: '14px' }}>Label Printed</strong>
                    <span style={{ fontSize: '12px', color: '#555' }}>Attach {selectedBox} label and seal package.</span>
                  </div>
                </div>
                
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#555' }}>
                  3. Confirm Carrier Handoff
                </label>
                <button 
                  onClick={handleFinalHandoff}
                  style={{ 
                    backgroundColor: '#27AE60', 
                    color: 'white', border: 'none', padding: '12px 15px', borderRadius: '6px', 
                    cursor: 'pointer', fontWeight: 'bold', width: '100%' 
                  }}
                >
                  Package Placed in Outbound Bin
                </button>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={() => onProcess(order.id)} 
            style={{ backgroundColor: '#8E44AD', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
          >
            Stage for Pickup
          </button>
        )}
      </div>

      {/* Simulated Shipping Label Modal */}
      {showLabelModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '8px', width: '400px', 
            fontFamily: 'monospace', color: '#000', boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            {/* Label Header */}
            <div style={{ borderBottom: '3px solid #000', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <strong style={{ fontSize: '18px' }}>P</strong><br/>
                <span style={{ fontSize: '12px' }}>{order.shippingSpeed?.toUpperCase() || 'STANDARD'}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', lineHeight: '1.4' }}>
                <strong>RCP FULFILLMENT</strong><br/>
                100 Retail Way<br/>
                Dallas, TX 75201
              </div>
            </div>

            {/* Ship To Section */}
            <div style={{ marginBottom: '30px', fontSize: '16px', lineHeight: '1.4' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>SHIP TO:</span><br/>
              <strong>{order.customer?.name?.toUpperCase()}</strong><br/>
              {order.customer?.address?.toUpperCase()}<br/>
              {order.customer?.city?.toUpperCase()}, {order.customer?.state?.toUpperCase()} {order.customer?.zip}
            </div>

            {/* Fake Barcode Generator (CSS only) */}
            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', height: '60px', width: '100%', backgroundColor: '#fff', gap: '2px' }}>
              {Array.from({ length: 45 }).map((_, i) => (
                <div key={i} style={{ height: '100%', width: `${Math.floor(Math.random() * 4) + 1}px`, backgroundColor: '#000' }}></div>
              ))}
            </div>
            
            <div style={{ textAlign: 'center', fontSize: '14px', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '30px' }}>
              {mockTrackingNumber}
            </div>

            <div style={{ borderTop: '2px dashed #CCC', paddingTop: '20px', textAlign: 'center', fontSize: '10px', color: '#666', marginBottom: '20px' }}>
              PKG: {selectedBox.toUpperCase()} | REF: {order.orderId}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setShowLabelModal(false)}
                style={{ flex: 1, padding: '12px', backgroundColor: '#E0E0E0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', color: '#1A1A1A' }}
              >
                Cancel
              </button>
              {/* UPDATED: Only prints label, does not finish order */}
              <button 
                onClick={handlePrintAction}
                style={{ flex: 2, padding: '12px', backgroundColor: '#2980B9', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function PackShipScreen() {
  const [sfsOrders, setSfsOrders] = useState<any[]>([]);
  const [bopisOrders, setBopisOrders] = useState<any[]>([]);

  const fetchPickedOrders = async () => {
    try {
      const q = query(collection(db, "orders"), where("status", "==", "Picked"));
      const querySnapshot = await getDocs(q);
      
      const sfs: any[] = [];
      const bopis: any[] = [];

      querySnapshot.docs.forEach(doc => {
        const orderData = doc.data();
        const order = { id: doc.id, ...orderData };
        if (orderData.orderType === "BOPIS") {
          bopis.push(order);
        } else {
          sfs.push(order);
        }
      });

      setSfsOrders(sfs);
      setBopisOrders(bopis);
    } catch (error) {
      console.error("Error fetching picked orders: ", error);
    }
  };

  useEffect(() => {
    fetchPickedOrders();
  }, []);

  const handleShipSfs = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "Shipped" });
      fetchPickedOrders();
    } catch (error) {
      console.error("Error updating SFS order: ", error);
    }
  };

  const handleStageBopis = async (orderId: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), { status: "Ready for Pickup" });
      fetchPickedOrders();
    } catch (error) {
      console.error("Error updating BOPIS order: ", error);
    }
  };

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Pack & Ship Operations</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* SFS Column */}
        <div>
          <h2 style={{ fontSize: '18px', borderBottom: '2px solid #2980B9', paddingBottom: '10px', marginBottom: '20px' }}>
            Ship From Store (SFS)
          </h2>
          {sfsOrders.length === 0 ? (
            <p style={{ color: '#A0A0A0', fontStyle: 'italic' }}>No pending SFS orders.</p>
          ) : (
            sfsOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                isSfs={true}
                onProcess={handleShipSfs}
              />
            ))
          )}
        </div>

        {/* BOPIS Column */}
        <div>
          <h2 style={{ fontSize: '18px', borderBottom: '2px solid #8E44AD', paddingBottom: '10px', marginBottom: '20px' }}>
            BOPIS Staging
          </h2>
          {bopisOrders.length === 0 ? (
            <p style={{ color: '#A0A0A0', fontStyle: 'italic' }}>No pending BOPIS orders.</p>
          ) : (
            bopisOrders.map(order => (
              <OrderCard 
                key={order.id} 
                order={order} 
                isSfs={false}
                onProcess={handleStageBopis}
              />
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default PackShipScreen;