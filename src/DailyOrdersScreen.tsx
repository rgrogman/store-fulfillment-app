import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

function DailyOrdersScreen() {
  const [archivedOrders, setArchivedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchArchivedOrders = async () => {
    try {
      // Query for orders that have reached a terminal state
      const q = query(
        collection(db, "orders"), 
        where("status", "in", ["Shipped", "Completed", "Rejected_To_OMS"])
      );
      const querySnapshot = await getDocs(q);
      
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort newest to oldest based on orderId (since we used random numbers, this is a proxy for demo purposes)
      orders.sort((a: any, b: any) => b.orderId.localeCompare(a.orderId));
      
      setArchivedOrders(orders);
    } catch (error) {
      console.error("Error fetching archived orders: ", error);
    }
  };

  useEffect(() => {
    fetchArchivedOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "Shipped": 
        return <span style={{ backgroundColor: '#2980B9', color: '#FFF', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SHIPPED</span>;
      case "Completed": 
        return <span style={{ backgroundColor: '#27AE60', color: '#FFF', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>COMPLETED</span>;
      case "Rejected_To_OMS": 
        return <span style={{ backgroundColor: '#C0392B', color: '#FFF', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>REJECTED</span>;
      default: 
        return <span style={{ backgroundColor: '#7F8C8D', color: '#FFF', padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{status.toUpperCase()}</span>;
    }
  };

  const filteredOrders = archivedOrders.filter(order => 
    order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#E0E0E0' }}>Store Order Repository</h1>
          <p style={{ margin: '5px 0 0 0', color: '#A0A0A0', fontSize: '14px' }}>Historical ledger of all closed and dispositioned orders.</p>
        </div>
        <div style={{ width: '300px' }}>
          <input 
            type="text" 
            placeholder="🔍 Search Order ID or Name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #2C3E50', backgroundColor: '#131E3A', color: '#FFF', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Dynamic View: Cards for Mobile, Table for Desktop */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        
        {/* Desktop Table View */}
        <div style={{ display: window.innerWidth < 768 ? 'none' : 'block' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#1A1A1A' }}>
            <thead style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #E0E0E0' }}>
              <tr>
                <th style={{ padding: '15px', fontSize: '14px', color: '#555' }}>Order ID</th>
                <th style={{ padding: '15px', fontSize: '14px', color: '#555' }}>Customer</th>
                <th style={{ padding: '15px', fontSize: '14px', color: '#555' }}>Type</th>
                <th style={{ padding: '15px', fontSize: '14px', color: '#555' }}>Disposition</th>
                <th style={{ padding: '15px', fontSize: '14px', color: '#555', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
  {filteredOrders.map(order => (
    <tr key={order.id} style={{ borderBottom: '1px solid #E0E0E0' }}>
      <td style={{ padding: '15px', fontSize: '14px',fontWeight: 'bold' }}>
        {order.orderId}
        {order.exceptionNotes && <span style={{ marginLeft: '8px', color: '#C0392B' }}>⚠️</span>}
      </td>
      <td style={{ padding: '15px', fontSize: '14px' }}>{order.customer?.name}</td>
      <td style={{ padding: '15px', fontSize: '14px' }}>{order.orderType}</td>
      <td style={{ padding: '15px', fontSize: '14px' }}>{getStatusBadge(order.status)}</td>
      <td style={{ padding: '15px', fontSize: '14px', textAlign: 'right' }}>
        <button onClick={() => setSelectedOrder(order)} style={{ backgroundColor: '#EAF2F8', color: '#2980B9', border: '1px solid #2980B9', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Details</button>
      </td>
    </tr>
  ))}
</tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div style={{ display: window.innerWidth < 768 ? 'flex' : 'none', flexDirection: 'column', padding: '15px', gap: '10px' }}>
          {filteredOrders.map(order => (
            <div key={order.id} style={{ padding: '15px', border: '1px solid #E0E0E0', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 'bold', color: '#041053' }}>{order.orderId} {order.exceptionNotes && <span style={{ marginLeft: '8px', color: '#C0392B' }}>⚠️</span>}
    </div>
                <div style={{ fontSize: '12px', color: '#666' }}>{order.customer?.name}</div>
              </div>
              <button onClick={() => setSelectedOrder(order)} style={{ backgroundColor: '#EAF2F8', color: '#2980B9', border: '1px solid #2980B9', padding: '8px 12px', borderRadius: '4px', fontWeight: 'bold' }}>Details</button>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div style={{ padding: '30px', textAlign: 'center', color: '#A0A0A0', fontStyle: 'italic' }}>
            No historical orders found.
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', padding: '30px', borderRadius: '8px', width: '500px', 
            color: '#1A1A1A', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', maxHeight: '80vh', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #E0E0E0', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#020340',fontSize: '20px' }}>Order Details: {selectedOrder.orderId}</h2>
              {getStatusBadge(selectedOrder.status)}
            </div>

            <div style={{ marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              <strong>Customer:</strong> {selectedOrder.customer?.name} <br/>
              <strong>Address:</strong> {selectedOrder.customer?.address}, {selectedOrder.customer?.city}, {selectedOrder.customer?.state} {selectedOrder.customer?.zip} <br/>
              <strong>Order Type:</strong> {selectedOrder.orderType} <br/>
              {selectedOrder.shippingSpeed && <><br/><strong>Shipping Speed:</strong> {selectedOrder.shippingSpeed}</>}
              {selectedOrder.stagingLocation && <><br/><strong>Staged At:</strong> {selectedOrder.stagingLocation}</>}
            </div>

            {selectedOrder.exceptionNotes && (
              <div style={{ backgroundColor: '#FDEDEC', borderLeft: '4px solid #C0392B', padding: '10px 15px', marginBottom: '20px', fontSize: '13px', color: '#C0392B' }}>
                <strong>Exception Log:</strong> {selectedOrder.exceptionNotes}
              </div>
            )}

            <div style={{ backgroundColor: '#F8F9FA', padding: '15px', borderRadius: '6px', border: '1px solid #EAECEE' }}>
              <strong style={{ display: 'block', marginBottom: '10px', fontSize: '14px' }}>Order Manifest</strong>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
                {selectedOrder.items?.map((item: any, index: number) => (
                  <li key={index} style={{ marginBottom: '6px' }}>
                    {item.quantity}x {item.name} <span style={{ color: '#7F8C8D', fontStyle: 'italic' }}>({item.status})</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => setSelectedOrder(null)}
              style={{ marginTop: '20px', width: '100%', padding: '12px', backgroundColor: '#2C3E50', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Close Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DailyOrdersScreen;