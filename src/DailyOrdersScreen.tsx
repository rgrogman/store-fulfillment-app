import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

// SVG Icons
const DownloadIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const SearchIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7F8C8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
const TrendingUpIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;
const PackageIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const AlertCircleIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>;
const ClockIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;

function DailyOrdersScreen() {
  const [archivedOrders, setArchivedOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  const fetchArchivedOrders = async () => {
    try {
      // Query for orders that have reached a terminal state
      const q = query(
        collection(db, "orders"), 
        where("status", "in", ["Shipped", "Completed", "Rejected_To_OMS", "Cancelled_Abandoned"])
      );
      const querySnapshot = await getDocs(q);
      
      const orders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort newest to oldest
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
        return <span style={{ backgroundColor: '#2980B9', color: '#FFF', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SHIPPED</span>;
      case "Completed": 
        return <span style={{ backgroundColor: '#27AE60', color: '#FFF', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>PICKED UP</span>;
      case "Rejected_To_OMS": 
      case "Cancelled_Abandoned":
        return <span style={{ backgroundColor: '#C0392B', color: '#FFF', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{status === "Rejected_To_OMS" ? "REJECTED" : "ABANDONED"}</span>;
      default: 
        return <span style={{ backgroundColor: '#7F8C8D', color: '#FFF', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{status.toUpperCase()}</span>;
    }
  };

  const filteredOrders = archivedOrders.filter(order => {
    const matchesSearch = order.orderId?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          order.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterType === "BOPIS") matchesFilter = order.orderType === "BOPIS";
    if (filterType === "SFS") matchesFilter = order.orderType !== "BOPIS";
    if (filterType === "EXCEPTIONS") matchesFilter = order.status === "Rejected_To_OMS" || order.status === "Cancelled_Abandoned" || !!order.exceptionNotes;
    if (filterType === "SUCCESS") matchesFilter = order.status === "Shipped" || order.status === "Completed";

    return matchesSearch && matchesFilter;
  });

  const handleExportCSV = () => {
    const headers = ["Order ID", "Customer Name", "Order Type", "Disposition Status", "Item Count"];
    const csvRows = filteredOrders.map(order => {
      const itemCount = order.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
      return [
        order.orderId,
        `"${order.customer?.name || ''}"`,
        order.orderType,
        order.status,
        itemCount
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...csvRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RCP_Fulfillment_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate KPIs based on the filtered view
  const totalVolume = filteredOrders.length;
  const fulfilledVolume = filteredOrders.filter(o => o.status === "Shipped" || o.status === "Completed").length;
  const exceptionVolume = filteredOrders.filter(o => o.status === "Rejected_To_OMS" || o.status === "Cancelled_Abandoned" || o.exceptionNotes).length;
  const fulfillmentRate = totalVolume > 0 ? Math.round((fulfilledVolume / totalVolume) * 100) : 0;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold', color: '#E0E0E0' }}>Store Fulfillment Repository</h1>
        <p style={{ margin: '5px 0 0 0', color: '#A0A0A0', fontSize: '15px' }}>Historical ledger, audit trails, and reporting analytics.</p>
      </div>

      {/* KPI Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: '#131E3A', border: '1px solid #2C3E50', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: '#1A2542', color: '#3498DB', padding: '12px', borderRadius: '8px' }}><PackageIcon /></div>
          <div>
            <div style={{ color: '#A0A0A0', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Processed Volume</div>
            <div style={{ color: '#FFF', fontSize: '24px', fontWeight: 'bold' }}>{totalVolume} <span style={{ fontSize: '14px', color: '#7F8C8D', fontWeight: 'normal' }}>orders</span></div>
          </div>
        </div>
        
        <div style={{ backgroundColor: '#131E3A', border: '1px solid #2C3E50', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: '#182C25', color: '#27AE60', padding: '12px', borderRadius: '8px' }}><TrendingUpIcon /></div>
          <div>
            <div style={{ color: '#A0A0A0', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Fulfillment Rate</div>
            <div style={{ color: '#FFF', fontSize: '24px', fontWeight: 'bold' }}>{fulfillmentRate}%</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#131E3A', border: '1px solid #2C3E50', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
          <div style={{ backgroundColor: '#3B1A1A', color: '#E74C3C', padding: '12px', borderRadius: '8px' }}><AlertCircleIcon /></div>
          <div>
            <div style={{ color: '#A0A0A0', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase' }}>Exceptions / Rejects</div>
            <div style={{ color: '#FFF', fontSize: '24px', fontWeight: 'bold' }}>{exceptionVolume} <span style={{ fontSize: '14px', color: '#7F8C8D', fontWeight: 'normal' }}>impacted</span></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#131E3A', padding: '15px 20px', borderRadius: '12px', border: '1px solid #2C3E50', flexWrap: 'wrap', gap: '15px' }}>
        
        <div style={{ display: 'flex', gap: '15px', flexGrow: 1, alignItems: 'center' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', width: '300px', flexGrow: 1, maxWidth: '400px' }}>
            <div style={{ position: 'absolute', left: '15px', top: '12px' }}><SearchIcon /></div>
            <input 
              type="text" 
              placeholder="Search Order ID or Customer Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '8px', border: '1px solid #2C3E50', backgroundColor: '#1A2542', color: '#FFF', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Filter Dropdown */}
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ padding: '12px 15px', borderRadius: '8px', border: '1px solid #2C3E50', backgroundColor: '#1A2542', color: '#FFF', fontSize: '14px', cursor: 'pointer', outline: 'none' }}
          >
            <option value="ALL">View All Orders</option>
            <option value="SFS">Ship-from-Store (SFS) Only</option>
            <option value="BOPIS">In-Store Pickup (BOPIS) Only</option>
            <option value="SUCCESS">Successfully Fulfilled</option>
            <option value="EXCEPTIONS">Exceptions / Cancelled</option>
          </select>
        </div>
        
        <button 
          onClick={handleExportCSV}
          disabled={filteredOrders.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#2980B9', color: '#FFF', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: filteredOrders.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px', opacity: filteredOrders.length > 0 ? 1 : 0.5 }}
        >
          <DownloadIcon /> Export Data
        </button>
      </div>

      {/* Data Grid */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
        
        <div style={{ display: window.innerWidth < 768 ? 'none' : 'block' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', color: '#1A1A1A' }}>
            <thead style={{ backgroundColor: '#F8F9FA', borderBottom: '2px solid #EAECEE' }}>
              <tr>
                <th style={{ padding: '18px 20px', fontSize: '13px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Order ID</th>
                <th style={{ padding: '18px 20px', fontSize: '13px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer</th>
                <th style={{ padding: '18px 20px', fontSize: '13px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type</th>
                <th style={{ padding: '18px 20px', fontSize: '13px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Disposition</th>
                <th style={{ padding: '18px 20px', fontSize: '13px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid #EAECEE', transition: 'background-color 0.2s', cursor: 'pointer' }} onClick={() => setSelectedOrder(order)} onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8F9FA'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#FFF'}>
                  <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 'bold', color: '#2C3E50' }}>
                    {order.orderId}
                    {order.exceptionNotes && <span style={{ marginLeft: '8px', color: '#E74C3C' }} title="Exception Handled">⚠️</span>}
                  </td>
                  <td style={{ padding: '18px 20px', fontSize: '14px', color: '#34495E' }}>{order.customer?.name}</td>
                  <td style={{ padding: '18px 20px', fontSize: '14px', color: '#34495E' }}>
                    <span style={{ backgroundColor: '#F2F3F4', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', color: '#555' }}>{order.orderType}</span>
                  </td>
                  <td style={{ padding: '18px 20px', fontSize: '14px' }}>{getStatusBadge(order.status)}</td>
                  <td style={{ padding: '18px 20px', textAlign: 'right' }}>
                    <span style={{ color: '#2980B9', fontWeight: 'bold', fontSize: '13px' }}>View Report &rarr;</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#7F8C8D' }}>
            <div style={{ fontSize: '30px', marginBottom: '10px' }}>📭</div>
            <h3 style={{ margin: '0 0 5px 0', color: '#2C3E50' }}>No Records Found</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>Try adjusting your search filters.</p>
          </div>
        )}
      </div>

      {/* Advanced Order Detail Modal */}
      {selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', width: '100%', maxWidth: '700px', color: '#1A1A1A', boxShadow: '0 12px 30px rgba(0,0,0,0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '25px 30px', borderBottom: '1px solid #EAECEE', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: '12px 12px 0 0' }}>
              <div>
                <h2 style={{ margin: 0, color: '#2C3E50', fontSize: '22px', fontWeight: 'bold' }}>Audit Record: {selectedOrder.orderId}</h2>
                <div style={{ marginTop: '8px', fontSize: '13px', color: '#555', display: 'flex', gap: '15px' }}>
                  <span><strong>Customer:</strong> {selectedOrder.customer?.name}</span>
                  <span><strong>Type:</strong> {selectedOrder.orderType}</span>
                </div>
              </div>
              <div>{getStatusBadge(selectedOrder.status)}</div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '30px', overflowY: 'auto', flexGrow: 1 }}>
              
              {/* Lifecycle Timeline */}
              <div style={{ marginBottom: '35px' }}>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifecycle Timeline</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '15px', top: '20px', bottom: '20px', width: '2px', backgroundColor: '#EAECEE', zIndex: 0 }}></div>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#2C3E50', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}><ClockIcon /></div>
                    <div style={{ backgroundColor: '#F8F9FA', padding: '12px 15px', borderRadius: '8px', border: '1px solid #EAECEE', flexGrow: 1 }}>
                      <strong style={{ display: 'block', fontSize: '14px', color: '#2C3E50' }}>Order Received from OMS</strong>
                      <span style={{ fontSize: '12px', color: '#7F8C8D' }}>System Allocation</span>
                    </div>
                  </div>

                  {(selectedOrder.exceptionNotes || selectedOrder.status === "Rejected_To_OMS") && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E74C3C', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>⚠️</div>
                      <div style={{ backgroundColor: '#FDEDEC', padding: '12px 15px', borderRadius: '8px', border: '1px solid #FADBD8', flexGrow: 1 }}>
                        <strong style={{ display: 'block', fontSize: '14px', color: '#C0392B' }}>Exception Flagged</strong>
                        <span style={{ fontSize: '12px', color: '#C0392B' }}>{selectedOrder.exceptionNotes || "Manager rejected full order back to DC."}</span>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '15px', position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#27AE60', color: '#FFF', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>✓</div>
                    <div style={{ backgroundColor: '#EAFAF1', padding: '12px 15px', borderRadius: '8px', border: '1px solid #D5F5E3', flexGrow: 1 }}>
                      <strong style={{ display: 'block', fontSize: '14px', color: '#196F3D' }}>Terminal Disposition Reached</strong>
                      <span style={{ fontSize: '12px', color: '#229954' }}>Status: {selectedOrder.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rich Item Manifest */}
              <div>
                <h3 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#7F8C8D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Final Item Manifest</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedOrder.items?.map((item: any, index: number) => {
                    const isException = item.status?.includes('Exception');
                    return (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px', backgroundColor: isException ? '#FDEDEC' : '#FFF', border: isException ? '1px solid #FADBD8' : '1px solid #EAECEE', borderRadius: '8px' }}>
                        <div style={{ width: '45px', height: '45px', backgroundColor: '#F8F9FA', borderRadius: '6px', border: '1px solid #EAECEE', overflow: 'hidden', flexShrink: 0 }}>
                          <img 
                            src={`/images/${item.sku}.png`} 
                            alt={item.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isException ? 0.6 : 1 }}
                            onError={(e) => { (e.target as HTMLImageElement).src = `https://placehold.co/50x50/F8F9FA/6C757D?text=${item.name.charAt(0).toUpperCase()}`; }}
                          />
                        </div>
                        
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold', color: isException ? '#C0392B' : '#2C3E50' }}>{item.name}</span>
                          <span style={{ fontSize: '12px', color: '#7F8C8D' }}>SKU: {item.sku}</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                          <span style={{ backgroundColor: '#F2F3F4', color: '#2C3E50', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' }}>Qty: {item.quantity}</span>
                          {isException && <span style={{ color: '#C0392B', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>{item.status}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '20px 30px', borderTop: '1px solid #EAECEE', backgroundColor: '#F8F9FA', borderRadius: '0 0 12px 12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setSelectedOrder(null)}
                style={{ padding: '12px 24px', backgroundColor: '#2C3E50', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', transition: 'background-color 0.2s' }}
              >
                Close Record
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default DailyOrdersScreen;