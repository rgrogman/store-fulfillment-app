import { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useIntegration } from "./IntegrationContext";

// Dictionary for Carton Metadata
const CARTON_SPECS: Record<string, { size: string, desc: string }> = {
  "Polybag": { size: "14\" x 18\"", desc: "Flexible, non-fragile" },
  "Small Box": { size: "12\" x 9\" x 6\"", desc: "Best fit for apparel" },
  "Medium Box": { size: "16\" x 12\" x 8\"", desc: "Good for multiple items" },
  "Large Box": { size: "18\" x 14\" x 10\"", desc: "Room to spare" },
  "Extra Large Box": { size: "24\" x 18\" x 12\"", desc: "Oversized items only" }
};

// SVG Icons for clean, monochrome UI
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const BoxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>;

const ActiveOrderCard = ({ order, onProcess }: { order: any, onProcess: (order: any, extraData?: any) => void }) => {
  const { addEvent } = useIntegration();
  const isSfs = order.orderType !== "BOPIS";

  const [step, setStep] = useState(1);
  const [cartons, setCartons] = useState<any[]>([]);
  const [verifiedItems, setVerifiedItems] = useState<Set<number>>(new Set());
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [isLabelPrinted, setIsLabelPrinted] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stagingBin, setStagingBin] = useState("");
  const [recommendedBox, setRecommendedBox] = useState("");

  const steps = isSfs 
    ? ["Verify Items", "Select Carton", "Generate Label"] 
    : ["Verify Items", "Bag Items", "Confirm Location"];

  const validItemsToPack = order.items?.filter((item: any) => item.status === "Picked") || [];

  // Reset state when a new order is selected
  useEffect(() => {
    setStep(1);
    setVerifiedItems(new Set());
    setIsLabelPrinted(false);
    setStagingBin("");
    
    if (isSfs && order.items) {
      let totalVolume = 0;
      const pickedItems = order.items.filter((item: any) => item.status === "Picked");
      
      pickedItems.forEach((item: any) => {
        const mockVolumeUnit = item.name.toLowerCase().includes("jacket") ? 8 : 2; 
        totalVolume += (item.quantity * mockVolumeUnit);
      });

      let recBox = "Polybag";
      if (totalVolume > 5) recBox = "Small Box";
      if (totalVolume > 12) recBox = "Medium Box";
      if (totalVolume > 20) recBox = "Large Box";
      if (totalVolume > 35) recBox = "Extra Large Box";

      setRecommendedBox(recBox);
      setCartons([{ id: 1, type: recBox, tracking: "" }]);
    }
  }, [order, isSfs]);
  
  const handleVerifyItem = (idx: number) => {
    const newSet = new Set(verifiedItems);
    newSet.add(idx);
    setVerifiedItems(newSet);
    
    // Auto-transition to Step 2 when all items are verified
    if (newSet.size === validItemsToPack.length) {
      setTimeout(() => {
        setStep(2);
      }, 500);
    }
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

  const renderStepper = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid #EAECEE', marginBottom: '20px' }}>
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isActive = step === stepNum;
        const isPast = step > stepNum;
        
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', flex: index !== steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ 
                width: '28px', height: '28px', borderRadius: '50%', 
                backgroundColor: isActive || isPast ? '#27AE60' : '#E0E0E0', 
                color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', 
                fontWeight: 'bold', fontSize: '13px' 
              }}>
                {isPast ? '✓' : stepNum}
              </div>
              <span style={{ fontSize: '14px', fontWeight: isActive ? 'bold' : 'normal', color: isActive || isPast ? '#2C3E50' : '#A0A0A0' }}>
                {label}
              </span>
            </div>
            {index !== steps.length - 1 && (
              <div style={{ flex: 1, height: '2px', backgroundColor: isPast ? '#27AE60' : '#EAECEE', margin: '0 15px' }} />
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
      
      {/* Header Info */}
      <div style={{ padding: '25px', borderBottom: '1px solid #EAECEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#2C3E50' }}>Order {order.orderId}</h2>
          
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px', fontSize: '13px', color: '#555' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserIcon />
              <strong>{order.customer?.name}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BoxIcon />
              {order.orderType === 'BOPIS' ? 'In-Store Pickup' : 'Ship from Store'}
            </span>
            {isSfs && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TruckIcon />
                {order.shippingSpeed === "Priority" || order.shippingSpeed === "Overnight" ? (
                  <span style={{ 
                    backgroundColor: order.shippingSpeed === "Overnight" ? "#C0392B" : "#D35400", 
                    color: '#FFF', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' 
                  }}>
                    {order.shippingSpeed}
                  </span>
                ) : (
                  <span>{order.shippingSpeed}</span>
                )}
              </span>
            )}
          </div>
        </div>
        <div>
          <span style={{ backgroundColor: '#27AE60', color: '#FFF', padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>PICKED</span>
        </div>
      </div>

      {renderStepper()}

      <div style={{ padding: '20px 30px', flexGrow: 1, overflowY: 'auto' }}>
        
        {/* STEP 1: VERIFY */}
        {step === 1 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#2C3E50' }}>Verify Items to Pack</h3>
              <span style={{ fontSize: '13px', color: verifiedItems.size === validItemsToPack.length ? '#27AE60' : '#7F8C8D', fontWeight: 'bold' }}>
                {verifiedItems.size === validItemsToPack.length ? '✓ All items verified' : `${verifiedItems.size} of ${validItemsToPack.length} items verified`}
              </span>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EAECEE', color: '#7F8C8D', fontSize: '12px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 0', width: '60%' }}>Item</th>
                  <th style={{ padding: '10px 0' }}>SKU</th>
                  <th style={{ padding: '10px 0', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '10px 0', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {validItemsToPack.map((item: any, idx: number) => {
                  const isVerified = verifiedItems.has(idx);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #EAECEE', transition: 'background-color 0.2s', backgroundColor: isVerified ? '#FAFAFA' : '#FFF' }}>
                      <td style={{ padding: '15px 0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ width: '50px', height: '50px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #EAECEE', overflow: 'hidden', flexShrink: 0 }}>
                          <img 
                            src={`/images/${item.sku}.png`} 
                            alt={item.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isVerified ? 0.6 : 1 }}
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/100x100/F8F9FA/6C757D?text=${item.name.charAt(0).toUpperCase()}`; }}
                          />
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 'bold', color: isVerified ? '#7F8C8D' : '#2C3E50', textDecoration: isVerified ? 'line-through' : 'none' }}>
                          {item.name}
                        </span>
                      </td>
                      <td style={{ padding: '15px 0', fontSize: '13px', color: '#555' }}>{item.sku}</td>
                      <td style={{ padding: '15px 0', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '15px 0', textAlign: 'center' }}>
                        <button 
                          onClick={() => handleVerifyItem(idx)}
                          disabled={isVerified}
                          style={isVerified ? {
                            color: '#27AE60', backgroundColor: '#EAFAF1', border: '1px solid #27AE60', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'default'
                          } : {
                            color: '#2980B9', backgroundColor: 'transparent', border: '1px solid #2980B9', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                          }}
                        >
                          {isVerified ? '✓ Verified' : 'Verify'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            <button 
              onClick={() => setStep(2)}
              disabled={verifiedItems.size < validItemsToPack.length}
              style={{ 
                marginTop: '30px', width: '100%', padding: '14px', 
                backgroundColor: verifiedItems.size < validItemsToPack.length ? '#BDC3C7' : '#2980B9', 
                color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', 
                cursor: verifiedItems.size < validItemsToPack.length ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s' 
              }}
            >
              {verifiedItems.size < validItemsToPack.length ? 'Verify all items to continue' : `Next: ${isSfs ? 'Select Carton' : 'Bag Items'}`}
            </button>
          </div>
        )}

        {/* STEP 2: CARTON / BAG */}
        {step === 2 && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2C3E50' }}>{isSfs ? 'Select Carton / Packaging' : 'Prepare Order Bag'}</h3>
            
            {isSfs ? (
              <div>
                {cartons.map((carton, cIndex) => (
                  <div key={carton.id} style={{ marginBottom: '25px' }}>
                    {cartons.length > 1 && <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#2C3E50' }}>Carton {cIndex + 1}</h4>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                      {Object.keys(CARTON_SPECS).map(box => {
                        const isSelected = carton.type === box;
                        return (
                          <div 
                            key={box}
                            onClick={() => handleUpdateCartonType(carton.id, box)}
                            style={{
                              border: isSelected ? (box === recommendedBox ? '2px solid #27AE60' : '2px solid #F39C12') : '1px solid #EAECEE',
                              backgroundColor: isSelected ? (box === recommendedBox ? '#F4FDF8' : '#FEF5E7') : '#FFF',
                              borderRadius: '8px', padding: '15px', cursor: 'pointer', textAlign: 'center',
                              position: 'relative', transition: 'all 0.2s'
                            }}
                          >
                            {isSelected && (
                              <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: box === recommendedBox ? '#27AE60' : '#F39C12', color: '#FFF', fontSize: '10px', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                {box === recommendedBox ? 'System Pick' : 'Overridden'}
                              </div>
                            )}
                            <strong style={{ display: 'block', fontSize: '14px', color: '#2C3E50', marginBottom: '5px', marginTop: isSelected ? '10px' : '0' }}>{box}</strong>
                            <span style={{ display: 'block', fontSize: '12px', color: '#7F8C8D', marginBottom: '2px' }}>{CARTON_SPECS[box].size}</span>
                            <span style={{ display: 'block', fontSize: '11px', color: '#A0A0A0', fontStyle: 'italic' }}>{CARTON_SPECS[box].desc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {cartons.length < 3 && (
                  <div 
                    onClick={() => setCartons([...cartons, { id: cartons.length + 1, type: recommendedBox, tracking: "" }])}
                    style={{ border: '1px dashed #2980B9', padding: '12px', textAlign: 'center', borderRadius: '8px', color: '#2980B9', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}
                  >
                    + Split Shipment (Add Carton)
                  </div>
                )}
              </div>
            ) : (
              <div style={{ backgroundColor: '#F8F9FA', padding: '30px', borderRadius: '8px', border: '1px solid #EAECEE', textAlign: 'center' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '15px' }}>🛍️</span>
                <p style={{ color: '#555', fontSize: '15px', margin: 0 }}>Place all verified items into a standard store pickup bag and attach the order receipt.</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button 
                onClick={() => setStep(1)}
                style={{ flex: 1, padding: '14px', backgroundColor: '#FFF', color: '#555', border: '1px solid #BDC3C7', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
              >Back</button>
              <button 
                onClick={() => {
                  setStep(3);
                  if (isSfs) {
                    handleGenerateLabelsClick();
                  }
                }}
                disabled={isGenerating}
                style={{ flex: 3, padding: '14px', backgroundColor: '#2980B9', color: '#FFF', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isSfs ? 'Next: Generate Labels' : 'Next: Confirm Location'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: LABEL / STAGE */}
        {step === 3 && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#2C3E50' }}>{isSfs ? 'Finalize Shipment' : 'Stage for Pickup'}</h3>
            
            {isSfs ? (
              <div style={{ textAlign: 'center' }}>
                {isGenerating ? (
                   <div style={{ padding: '40px', color: '#2980B9', fontWeight: 'bold', fontSize: '18px' }}>
                     Communicating with Carriers... 
                   </div>
                ) : (
                  <div style={{ backgroundColor: '#EAF2F8', padding: '30px', borderRadius: '8px', border: '1px solid #2980B9' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>✅</div>
                    <strong style={{ display: 'block', color: '#2980B9', fontSize: '18px', marginBottom: '5px' }}>
                      {cartons.length > 1 ? 'Labels Printed Successfully' : 'Label Printed Successfully'}
                    </strong>
                    <p style={{ fontSize: '14px', color: '#555', marginBottom: '25px' }}>
                      Attach {cartons.length > 1 ? 'labels to cartons' : `label to ${cartons[0]?.type}`} and seal.
                    </p>
                    
                    <button 
                      onClick={() => onProcess(order, { cartons })}
                      style={{ backgroundColor: '#27AE60', color: 'white', border: 'none', padding: '14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '15px' }}
                    >
                      Confirm Carrier Handoff
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#555' }}>Scan or Enter Staging Bin</label>
                <input 
                  type="text" 
                  placeholder="e.g., Bin A-12, Locker 4, Front Desk" 
                  value={stagingBin}
                  onChange={(e) => setStagingBin(e.target.value)}
                  style={{ width: '100%', padding: '14px', borderRadius: '8px', border: '1px solid #BDC3C7', marginBottom: '20px', boxSizing: 'border-box', fontSize: '15px' }}
                />
                <button 
                  onClick={() => onProcess(order, { stagingBin })} 
                  disabled={!stagingBin.trim()}
                  style={{ backgroundColor: stagingBin.trim() ? '#8E44AD' : '#95A5A6', color: 'white', border: 'none', padding: '16px', borderRadius: '8px', cursor: stagingBin.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', width: '100%', fontSize: '16px' }}
                >
                  Confirm & Stage Order
                </button>
              </div>
            )}
            
            {(!isLabelPrinted && !isGenerating && !isSfs) && (
              <button onClick={() => setStep(2)} style={{ marginTop: '15px', width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#555', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                Go Back
              </button>
            )}
          </div>
        )}
      </div>

      {/* Label Modal (SFS Only) */}
      {showLabelModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '8px', fontFamily: 'monospace', color: '#000', width: '100%', maxWidth: '400px' }}>
            <div style={{ borderBottom: '3px solid #000', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><strong style={{ fontSize: '24px' }}>P</strong><br/><span style={{ fontSize: '12px' }}>{order.shippingSpeed?.toUpperCase() || 'STANDARD'}</span></div>
              <div style={{ textAlign: 'right', fontSize: '12px' }}><strong>RCP FULFILLMENT</strong><br/>Dallas, TX 75201</div>
            </div>
            <div style={{ marginBottom: '30px', fontSize: '16px', lineHeight: '1.4' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>SHIP TO:</span><br/><strong>{order.customer?.name?.toUpperCase()}</strong><br/>{order.customer?.address?.toUpperCase()}<br/>{order.customer?.city?.toUpperCase()}, {order.customer?.state?.toUpperCase()} {order.customer?.zip}
            </div>
            
            {cartons.map((c) => (
               <div key={c.id} style={{ textAlign: 'center', fontSize: '14px', letterSpacing: '2px', fontWeight: 'bold', borderTop: '2px dashed #CCC', paddingTop: '15px', marginTop: '15px' }}>
                 {cartons.length > 1 && <div style={{ fontSize: '11px', color: '#555', marginBottom: '4px' }}>CARTON {c.id}</div>}
                 {c.tracking}
               </div>
            ))}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button onClick={() => { setShowLabelModal(false); setIsLabelPrinted(true); }} style={{ flex: 1, padding: '14px', backgroundColor: '#2980B9', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{cartons.length > 1 ? 'Print Labels' : 'Print Label'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function PackShipScreen() {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const { addEvent } = useIntegration();

  const fetchPickedOrders = async () => {
    try {
      const q = query(collection(db, "orders"), where("status", "==", "Picked"));
      const querySnapshot = await getDocs(q);
      
      const orders: any[] = [];
      querySnapshot.docs.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });

      setPendingOrders(orders);
      
      if (orders.length > 0 && !activeOrderId) {
        setActiveOrderId(orders[0].id);
      } else if (orders.length === 0) {
        setActiveOrderId(null);
      }
    } catch (error) {
      console.error("Error fetching picked orders: ", error);
    }
  };

  useEffect(() => { fetchPickedOrders(); }, []);

  const handleProcessComplete = async (order: any, extraData: any) => {
    try {
      const isSfs = order.orderType !== "BOPIS";
      
      if (isSfs) {
        await updateDoc(doc(db, "orders", order.id), { status: "Shipped" });
        const shipmentDetails = extraData?.cartons?.map((c: any) => ({ cartonId: c.id, packaging: c.type, trackingNumber: c.tracking })) || [];
        addEvent("SFS_PACK_COMPLETE", { orderId: order.orderId, status: "SHIPPED", shipmentDetails, action: "CARRIER_HANDOFF_CONFIRMED", location: { storeId: "STR-042" }, timestamp: new Date().toISOString() });
      } else {
        const bin = extraData?.stagingBin || "Front Desk";
        await updateDoc(doc(db, "orders", order.id), { status: "Ready for Pickup", stagingLocation: bin });
        addEvent("BOPIS_STAGING_UPDATE", { orderId: order.orderId, customer: order.customer?.name, newStatus: "READY_FOR_PICKUP", location: { storeId: "STR-042", holdBin: bin }, communications: { triggerSms: true, triggerEmail: true }, timestamp: new Date().toISOString() });
      }

      setActiveOrderId(null);
      fetchPickedOrders();
    } catch (error) {
      console.error("Error processing order: ", error);
    }
  };

  const activeOrder = pendingOrders.find(o => o.id === activeOrderId);

  return (
    <div style={{ padding: '30px 20px', maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 'bold', color: '#E0E0E0' }}>Pack & Stage Orders</h1>
        <p style={{ margin: '5px 0 0 0', color: '#A0A0A0', fontSize: '14px' }}>Verify items, select packaging, and finalize fulfillment.</p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '25px', flexGrow: 1, minHeight: 0 }}>
        
        {/* Left Column: Active Order Workflow */}
        <div style={{ minHeight: 0 }}>
          {activeOrder ? (
            <ActiveOrderCard order={activeOrder} onProcess={handleProcessComplete} />
          ) : (
            <div style={{ backgroundColor: '#131E3A', borderRadius: '12px', border: '1px solid #2C3E50', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#6C7A89', flexDirection: 'column' }}>
              <BoxIcon />
              <h2 style={{ margin: '15px 0 0 0' }}>Queue is Empty</h2>
              <p>No picked orders waiting for packing.</p>
            </div>
          )}
        </div>

        {/* Right Column: The Queue */}
        <div style={{ backgroundColor: '#1A2235', borderRadius: '12px', border: '1px solid #2C3E50', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '20px', backgroundColor: '#131E3A', borderBottom: '1px solid #2C3E50', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#FFF', fontSize: '16px' }}>Next Orders to Pack</h3>
            <span style={{ backgroundColor: '#34495E', color: '#FFF', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{pendingOrders.length}</span>
          </div>
          
          <div style={{ overflowY: 'auto', flexGrow: 1, padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingOrders.map(order => {
              const isActive = order.id === activeOrderId;
              return (
                <div 
                  key={order.id} 
                  onClick={() => setActiveOrderId(order.id)}
                  style={{ 
                    backgroundColor: isActive ? '#2980B9' : '#2C3E50',
                    border: isActive ? '1px solid #3498DB' : '1px solid transparent',
                    borderRadius: '8px', padding: '15px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '15px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ opacity: isActive ? 1 : 0.5, color: '#FFF' }}>
                    <BoxIcon />
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <strong style={{ display: 'block', color: '#FFF', fontSize: '14px', marginBottom: '2px' }}>{order.orderId}</strong>
                    <span style={{ color: isActive ? '#EAF2F8' : '#A0A0A0', fontSize: '12px' }}>{order.customer?.name}</span>
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: isActive ? '#FFF' : '#A0A0A0', backgroundColor: isActive ? 'rgba(0,0,0,0.2)' : '#1A2235', padding: '4px 8px', borderRadius: '4px' }}>
                    {order.orderType}
                  </div>
                </div>
              );
            })}
            
            {pendingOrders.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6C7A89', marginTop: '40px', fontSize: '14px' }}>
                All caught up!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default PackShipScreen;