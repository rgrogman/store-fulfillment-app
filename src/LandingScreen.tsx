import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

function LandingScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      const userRef = doc(db, "users", username.toLowerCase());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().pin === password) {
        const userData = userSnap.data();
        
        // Save to local storage to maintain session state
        localStorage.setItem("swiftpick_user", JSON.stringify(userData));
        
        // Route to the new dashboard
        navigate("/dashboard");
      } else {
        setErrorMsg("Invalid Employee ID or PIN.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setErrorMsg("System error connecting to database.");
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#131E3A', padding: '20px' }}>
      <div style={{ backgroundColor: '#FFFFFF', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: 0, fontSize: '32px', color: '#131E3A', fontWeight: '900', letterSpacing: '-1px' }}>SwiftPick</h1>
          <p style={{ margin: '5px 0 0 0', color: '#7F8C8D', fontSize: '14px' }}>Retail Operations Portal</p>
        </div>

        {errorMsg && (
          <div style={{ backgroundColor: '#FDEDEC', color: '#C0392B', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', fontWeight: 'bold' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>Employee ID</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. manager01"
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>PIN</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••"
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #CCC', fontSize: '16px', boxSizing: 'border-box' }}
            />
          </div>

          <button type="submit" style={{ backgroundColor: '#27AE60', color: 'white', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default LandingScreen;