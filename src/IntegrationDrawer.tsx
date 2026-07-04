import { useState } from "react";
import { useIntegration } from "./IntegrationContext";

function IntegrationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const { events } = useIntegration();

  // Custom JSON Syntax Highlighter
  const syntaxHighlight = (json: any) => {
    let jsonStr = typeof json !== 'string' ? JSON.stringify(json, null, 2) : json;
    
    // Escape HTML characters to prevent rendering issues
    jsonStr = jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Regex to wrap JSON elements in styled spans
    return jsonStr.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match: string) {
      let color = '#B5CEA8'; // Numbers (Green)
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          color = '#9CDCFE'; // Keys (Light Blue)
        } else {
          color = '#CE9178'; // Strings (Orange)
        }
      } else if (/true|false/.test(match)) {
        color = '#569CD6'; // Booleans (Dark Blue)
      } else if (/null/.test(match)) {
        color = '#569CD6'; // Null (Dark Blue)
      }
      return `<span style="color: ${color};">${match}</span>`;
    });
  };

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
          width: window.innerWidth < 600 ? '100%' : '500px', // Widened slightly for complex JSON
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

        {/* Log Feed */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingBottom: '80px' }}>
          
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', marginTop: '40px', fontStyle: 'italic', fontSize: '13px' }}>
              Listening for events...
            </div>
          ) : (
            events.map((evt) => (
              <div key={evt.id} style={{ 
                marginBottom: '20px', 
                backgroundColor: '#2D2D30', 
                borderRadius: '6px', 
                overflow: 'hidden', 
                border: '1px solid #3E3E42' 
              }}>
                
                {/* Event Header */}
                <div style={{ backgroundColor: '#333337', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #3E3E42' }}>
                  <span style={{ fontSize: '13px', color: '#4EC9B0', fontWeight: 'bold' }}>{evt.type}</span>
                  <span style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{evt.timestamp}</span>
                </div>
                
                {/* Event Payload (Now with Syntax Highlighting) */}
                <div style={{ padding: '15px', overflowX: 'auto', backgroundColor: '#1E1E1E' }}>
                  <pre 
                    style={{ margin: 0, fontSize: '13px', fontFamily: 'Consolas, Monaco, monospace', lineHeight: '1.5', textAlign: 'left', color: '#D4D4D4'}}
                    dangerouslySetInnerHTML={{ __html: syntaxHighlight(evt.payload) }}
                  />
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