import { useState } from "react";
import { useIntegration } from "./IntegrationContext";

function IntegrationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { events } = useIntegration();

  return (
    <>
      {/* Floating Action Button - ONLY renders when the drawer is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#2C3E50',
            color: '#ECF0F1',
            border: '2px solid #34495E',
            padding: '10px 16px',
            borderRadius: '30px',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          <span style={{ color: '#2ECC71' }}>{`</>`}</span> Integration Stream
        </button>
      )}

      {/* Slide-Out Drawer Overlay */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: window.innerWidth < 600 ? '100%' : '450px',
          backgroundColor: '#1E1E1E',
          color: '#D4D4D4',
          boxShadow: '-5px 0 25px rgba(0,0,0,0.5)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #333'
        }}
      >
        {/* Drawer Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#252526' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', color: '#FFF', fontWeight: 'bold' }}>API Event Stream</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#888' }}>Real-time enterprise payloads</p>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            style={{ backgroundColor: 'transparent', color: '#888', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '0 5px' }}
          >
            ✕
          </button>
        </div>

        {/* Log Feed - REMOVED flex properties, relying on standard block layout */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '80px' }}>
          
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '40px', fontStyle: 'italic', fontSize: '13px' }}>
              Listening for events...
            </div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} style={{ 
                marginBottom: '20px', // Replaces the flex gap
                backgroundColor: '#2D2D30', 
                borderRadius: '6px', 
                overflow: 'hidden', 
                border: '1px solid #3E3E42' 
              }}>
                
                {/* Event Header */}
                <div style={{ backgroundColor: '#333337', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #3E3E42' }}>
                  <span style={{ fontSize: '12px', color: '#4EC9B0', fontWeight: 'bold' }}>{evt.type}</span>
                  <span style={{ fontSize: '11px', color: '#888' }}>{evt.timestamp}</span>
                </div>
                
                {/* Event Payload (JSON) */}
                <div style={{ padding: '12px', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', color: '#CE9178', lineHeight: '1.4', textAlign: 'left'}}>
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
  
              </div>
            ))
          )}

        </div>
      </div>
    </>
  );
}

export default IntegrationDrawer;