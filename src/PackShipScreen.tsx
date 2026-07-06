import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useIntegration } from "./IntegrationContext";

const OrderCard = ({ order, isSfs, onProcess }: { order: any, isSfs: boolean, onProcess: (order: any, extraData?: any) => void }) => {
  const { addEvent } = useIntegration();

  const [cartons, setCartons] = useState<any[]>([]);
  const [itemAssignments, setItemAssignments] = useState<any>({}); 
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isLabelPrinted, setIsLabelPrinted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [stagingBin, setStagingBin] = useState("");

  const getSpeedColor = (speed: string) => {
    if (speed === "Overnight") return "#C0392B"; 
    if (speed === "Priority") return "#D35400";  
    return "#7F8C8D";                            
  };

  // Extract only the items that were successfully picked
  const validItemsToPack = order.items?.filter((item: any) => item.status === "Picked") || [];

  useEffect(() => {
    // Only calculate carton sizes based on items physically present to be packed
    if (isSfs && order.items) {
      let totalVolume = 0;
      const initialAssignments: any = {};
      
      const pickedItems = order.items.filter((item: any) => item.status === "Picked");
      
      pickedItems.forEach((item: any, index: number) => {
        const mockVolumeUnit = item.name.toLowerCase().includes("jacket") ? 8 : 2; 
        totalVolume += (item.quantity * mockVolumeUnit);
        initialAssignments[index] = 1; 
      });

      let recBox = "Polybag";
      if (totalVolume > 5) recBox = "Small Box";
      if (totalVolume > 12) recBox = "Medium Box";
      if (totalVolume > 20) recBox = "Large Box";
      if (totalVolume > 35) recBox = "Extra Large Box";

      setCartons([{ id: 1, type: recBox, tracking: "" }]);
      setItemAssignments(initialAssignments);
    }
  }, [isSfs, order]);

  const handleAddCarton = () => {
    if (cartons.length >= 3) return; 
    setCartons([...cartons, { id: cartons.length + 1, type: "Medium Box", tracking: "" }]);
  };

  const handleRemoveCarton = (cartonId: number) => {
    const newAssignments = { ...itemAssignments };
    Object.keys(newAssignments).forEach(idx => {
      if (newAssignments[idx] === cartonId) newAssignments[idx] = 1;
    });
    setItemAssignments(newAssignments);
    setCartons(cartons.filter(c => c.id !== cartonId));
  };

  const handleUpdateCartonType = (cartonId: number, boxType: string) => {
    setCartons(cartons.map(c => c.id === cartonId ? { ...c, type: boxType } : c));
  };

  const handleGenerateLabelsClick = () => {
    setIsGenerating(true);
    const updatedCartons = [...cartons];

    updatedCartons.forEach((carton, index) => {
      const newTracking = "1Z" + Math.random().toString(36).substring(2, 10).toUpperCase();
      carton.tracking = newTracking;

      addEvent("SHIPPING_API_REQUEST", {
        orderId: `${order.orderId}-BOX${carton.id}`,
        endpoint: "POST /v2/shipments",
        provider: "EasyPost_API",
        payload: {
          to_address: { name: order.customer?.name, zip: order.customer?.zip },
          parcel: { packaging_type: carton.type.toUpperCase().replace(' ', '_') },
          options: { requested_service: order.shippingSpeed?.toUpperCase() || "STANDARD" }
        }
      });

      setTimeout(() => {
        addEvent("SHIPPING_API_RESPONSE", {
          orderId: `${order.orderId}-BOX${carton.id}`,
          status: 201,
          response: {
            tracking_code: newTracking,
            rate_usd: carton.type === "Polybag" ? 4.50 : 8.45 + (index * 2), 
            carrier: "UPS"
          }
        });

        if (index === updatedCartons.length - 1) {
          setCartons(updatedCartons);
          setIsGenerating(false);
          setShowLabelModal(true);
        }
      }, 800 + (index * 400)); 
    });
  };

  const handleFinalHandoff = () => {
    onProcess(order, { cartons });
  };

  const handleStageBopisOrder = () => {
    onProcess(order, { stagingBin });
  };

  return (
    <>
      <div style={{ border: '1px solid #E0E0E0', padding: '20px', borderRadius: '12px', backgroundColor: '#FFFFFF', color: '#1A1A1A', boxShadow: '0 4px 12px rgba(0,0,0,0.06)', marginBottom: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#2C3E50' }}>Order {order.orderId}</h3>
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
        
        {/* Pack Verification: Only shows valid, physically present items */}
        <div style={{ backgroundColor: '#F8F9FA', padding: '15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: '1px solid #EAECEE' }}>
          <strong style={{ display: 'block', marginBottom: '10px', color: '#34495E' }}>Pack Verification:</strong>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validItemsToPack.map((item: any, index: number) => (
              <li key={index} style={{ marginBottom: '6px' }}>
                <strong>{item.quantity}x</strong> {item.name}
              </li>
            ))}
          </ul>
        </div>

        {isSfs ? (
          <div style={{ borderTop: '2px solid #EAECEE', paddingTop: '20px' }}>
            {!isLabelPrinted ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 'bold', color: '#2C3E50' }}>
                    1. Carton Configuration
                  </label>
                  {cartons.length === 1 && (
                    <span style={{ fontSize: '12px', color: '#27AE60', fontWeight: 'bold', backgroundColor: '#EAFAF1', padding: '4px 8px', borderRadius: '4px' }}>
                      ✨ System Optimized
                    </span>
                  )}
                </div>

                {cartons.map((carton, index) => (
                  <div key={carton.id} style={{ backgroundColor: '#F4F6F7', padding: '15px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #D5DBDB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <strong style={{ fontSize: '13px', color: '#34495E' }}>Carton {carton.id}</strong>
                      {index > 0 && (
                        <button onClick={() => handleRemoveCarton(carton.id)} style={{ background: 'none', border: 'none', color: '#E74C3C', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Remove</button>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {["Polybag", "Small Box", "Medium Box", "Large Box", "Extra Large Box"].map(box => (
                        <button
                          key={box}
                          onClick={() => handleUpdateCartonType(carton.id, box)}
                          style={{
                            padding: '6px 10px', fontSize: '12px', borderRadius: '4px', cursor: 'pointer',
                            border: carton.type === box ? '2px solid #2980B9' : '1px solid #BDC3C7',
                            backgroundColor: carton.type === box ? '#EAF2F8' : '#FFF',
                            color: carton.type === box ? '#2980B9' : '#555',
                            fontWeight: carton.type === box ? 'bold' : 'normal'
                          }}
                        >
                          {box}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <button 
                  onClick={handleAddCarton}
                  style={{ backgroundColor: 'transparent', color: '#2980B9', border: '1px dashed #2980B9', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', marginBottom: '20px', fontSize: '13px' }}
                >
                  + Split Shipment (Add Carton)
                </button>

                {/* Line Item Assignment: Only maps valid, physically present items */}
                {cartons.length > 1 && (
                  <div style={{ backgroundColor: '#FEF9E7', padding: '15px', borderRadius: '8px', border: '1px solid #F1C40F', marginBottom: '20px' }}>
                    <strong style={{ display: 'block', fontSize: '13px', color: '#B7950B', marginBottom: '10px' }}>Assign Items to Cartons</strong>
                    {validItemsToPack.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13px' }}>
                        <span>{item.name}</span>
                        <select 
                          value={itemAssignments[idx]}
                          onChange={(e) => setItemAssignments({ ...itemAssignments, [idx]: Number(e.target.value) })}
                          style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #CCC' }}
                        >
                          {cartons.map(c => (
                            <option key={c.id} value={c.id}>Carton {c.id}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
                
                <button 
                  onClick={handleGenerateLabelsClick} 
                  disabled={isGenerating}
                  style={{ 
                    backgroundColor: isGenerating ? '#34495E' : '#2980B9', 
                    color: 'white', border: 'none', padding: '14px 15px', borderRadius: '8px', 
                    cursor: isGenerating ? 'not-allowed' : 'pointer', 
                    fontWeight: 'bold', width: '100%', fontSize: '14px',
                    boxShadow: '0 4px 12px rgba(41, 128, 185, 0.3)'
                  }}
                >
                  {isGenerating ? "Communicating with Carriers..." : `2. Generate Carrier Label${cartons.length > 1 ? 's' : ''}`}
                </button>
              </>
            ) : (
              <div style={{ backgroundColor: '#EAF2F8', padding: '20px', borderRadius: '8px', border: '1px solid #2980B9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '24px' }}>✅</span>
                  <div>
                    <strong style={{ display: 'block', color: '#2980B9', fontSize: '16px' }}>Label{cartons.length > 1 ? 's' : ''} Printed</strong>
                    <span style={{ fontSize: '13px', color: '#555' }}>Attach labels to {cartons.length} carton(s) and seal.</span>
                  </div>
                </div>
                
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#2C3E50' }}>
                  3. Confirm Carrier Handoff
                </label>
                <button 
                  onClick={handleFinalHandoff}
                  style={{ backgroundColor: '#27AE60', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '14px' }}
                >
                  Packages Placed in Outbound Bin
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ borderTop: '2px solid #EAECEE', paddingTop: '20px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#2C3E50' }}>
              1. Enter Staging Location
            </label>
            <input 
              type="text" 
              placeholder="e.g., Bin A-12, Locker 4, Front Desk" 
              value={stagingBin}
              onChange={(e) => setStagingBin(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #BDC3C7', marginBottom: '20px', boxSizing: 'border-box', fontSize: '14px' }}
            />
            <button 
              onClick={handleStageBopisOrder} 
              disabled={!stagingBin.trim()}
              style={{ backgroundColor: stagingBin.trim() ? '#8E44AD' : '#95A5A6', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: stagingBin.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', width: '100%', fontSize: '14px' }}
            >
              2. Confirm & Stage Order
            </button>
          </div>
        )}
      </div>

      {showLabelModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{ maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '450px' }}>
            
            {cartons.map((carton, index) => (
              <div key={carton.id} style={{ backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '8px', fontFamily: 'monospace', color: '#000', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '10px', color: '#666', borderBottom: '1px dashed #CCC', paddingBottom: '5px' }}>
                  CARTON {index + 1} OF {cartons.length}
                </div>
                
                <div style={{ borderBottom: '3px solid #000', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ fontSize: '24px' }}>P</strong><br/>
                    <span style={{ fontSize: '12px' }}>{order.shippingSpeed?.toUpperCase() || 'STANDARD'}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', lineHeight: '1.4' }}>
                    <strong>RCP FULFILLMENT</strong><br/>
                    100 Retail Way<br/>
                    Dallas, TX 75201
                  </div>
                </div>

                <div style={{ marginBottom: '30px', fontSize: '16px', lineHeight: '1.4' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>SHIP TO:</span><br/>
                  <strong>{order.customer?.name?.toUpperCase()}</strong><br/>
                  {order.customer?.address?.toUpperCase()}<br/>
                  {order.customer?.city?.toUpperCase()}, {order.customer?.state?.toUpperCase()} {order.customer?.zip}
                </div>

                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', height: '60px', width: '100%', backgroundColor: '#fff', gap: '2px' }}>
                  {Array.from({ length: 45 }).map((_, i) => (
                    <div key={i} style={{ height: '100%', width: `${Math.floor(Math.random() * 4) + 1}px`, backgroundColor: '#000' }}></div>
                  ))}
                </div>
                
                <div style={{ textAlign: 'center', fontSize: '14px', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '30px' }}>
                  {carton.tracking}
                </div>

                <div style={{ borderTop: '2px dashed #CCC', paddingTop: '15px', textAlign: 'center', fontSize: '10px', color: '#666' }}>
                  PKG: {carton.type.toUpperCase()} | REF: {order.orderId}-C{carton.id}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px', backgroundColor: '#1A1A1A', padding: '15px', borderRadius: '8px' }}>
              <button onClick={() => setShowLabelModal(false)} style={{ flex: 1, padding: '14px', backgroundColor: '#E0E0E0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#1A1A1A' }}>
                Cancel
              </button>
              <button onClick={() => { setShowLabelModal(false); setIsLabelPrinted(true); }} style={{ flex: 2, padding: '14px', backgroundColor: '#2980B9', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                Print All Labels
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
  const { addEvent } = useIntegration();

  const fetchPickedOrders = async () => {
    try {
      const q = query(collection(db, "orders"), where("status", "==", "Picked"));
      const querySnapshot = await getDocs(q);
      
      const sfs: any[] = [];
      const bopis: any[] = [];

      querySnapshot.docs.forEach(doc => {
        const orderData = doc.data();
        const order = { id: doc.id, ...orderData };
        if (orderData.orderType === "BOPIS") bopis.push(order);
        else sfs.push(order);
      });

      setSfsOrders(sfs);
      setBopisOrders(bopis);
    } catch (error) {
      console.error("Error fetching picked orders: ", error);
    }
  };

  useEffect(() => { fetchPickedOrders(); }, []);

  const handleShipSfs = async (order: any, extraData: any) => {
    try {
      await updateDoc(doc(db, "orders", order.id), { status: "Shipped" });
      
      const shipmentDetails = extraData?.cartons?.map((c: any) => ({
        cartonId: c.id,
        packaging: c.type,
        trackingNumber: c.tracking
      })) || [];

      addEvent("SFS_PACK_COMPLETE", {
        orderId: order.orderId,
        status: "SHIPPED",
        shipmentDetails: shipmentDetails,
        action: "CARRIER_HANDOFF_CONFIRMED",
        location: { storeId: "STR-042" },
        timestamp: new Date().toISOString()
      });

      fetchPickedOrders();
    } catch (error) {
      console.error("Error updating SFS order: ", error);
    }
  };

  const handleStageBopis = async (order: any, extraData: any) => {
    try {
      const bin = extraData?.stagingBin || "Front Desk";
      
      await updateDoc(doc(db, "orders", order.id), { 
        status: "Ready for Pickup",
        stagingLocation: bin
      });

      addEvent("BOPIS_STAGING_UPDATE", {
        orderId: order.orderId,
        customer: order.customer?.name,
        newStatus: "READY_FOR_PICKUP",
        location: { storeId: "STR-042", holdBin: bin },
        communications: { triggerSms: true, triggerEmail: true },
        timestamp: new Date().toISOString()
      });

      fetchPickedOrders();
    } catch (error) {
      console.error("Error updating BOPIS order: ", error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', marginBottom: '30px', color: '#E0E0E0' }}>Pack & Ship Operations</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 850 ? '1fr' : '1.2fr 1fr', gap: '30px' }}>
        
        <div>
          <h2 style={{ fontSize: '18px', color: '#2980B9', borderBottom: '2px solid #2980B9', paddingBottom: '10px', marginBottom: '20px', textTransform: 'uppercase' }}>
            Ship From Store (SFS)
          </h2>
          {sfsOrders.length === 0 ? (
            <div style={{ backgroundColor: '#131E3A', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '1px solid #1F2937' }}>
              <p style={{ color: '#A0A0A0', fontStyle: 'italic', margin: 0 }}>No pending SFS orders.</p>
            </div>
          ) : (
            sfsOrders.map(order => <OrderCard key={order.id} order={order} isSfs={true} onProcess={handleShipSfs} />)
          )}
        </div>

        <div>
          <h2 style={{ fontSize: '18px', color: '#8E44AD', borderBottom: '2px solid #8E44AD', paddingBottom: '10px', marginBottom: '20px', textTransform: 'uppercase' }}>
            BOPIS Staging
          </h2>
          {bopisOrders.length === 0 ? (
            <div style={{ backgroundColor: '#131E3A', padding: '30px', borderRadius: '8px', textAlign: 'center', border: '1px solid #1F2937' }}>
              <p style={{ color: '#A0A0A0', fontStyle: 'italic', margin: 0 }}>No pending BOPIS orders.</p>
            </div>
          ) : (
            bopisOrders.map(order => <OrderCard key={order.id} order={order} isSfs={false} onProcess={handleStageBopis} />)
          )}
        </div>

      </div>
    </div>
  );
}

export default PackShipScreen;