const { useState, useEffect } = React;

const API = "http://localhost:3000";

function VotingPortal() {
  const [view, setView] = useState("welcome");
  const [roll, setRoll] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [token, setToken] = useState("");
  const [role, setRole] = useState("");
  const [results, setResults] = useState([]);
  const [announced, setAnnounced] = useState(null);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [candidates] = useState(["Candidate A", "Candidate B", "Candidate C"]);

  const showMsg = (text, type = "info") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const api = async (path, options = {}) => {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (token) headers.Authorization = token;
    const res = await fetch(API + path, { ...options, headers });
    const data = res.ok ? await res.json().catch(() => ({})) : await res.json().catch(() => ({ error: res.statusText }));
    if (!res.ok) throw new Error(data.error || data.message || "Request failed");
    return data;
  };

  const loadAnnounced = async () => {
    try {
      const data = await fetch(API + "/announced-results").then(r => r.json());
      setAnnounced(data.announced ? data : null);
    } catch {
      setAnnounced(null);
    }
  };

  useEffect(() => {
    loadAnnounced();
    const t = setInterval(loadAnnounced, 15000);
    return () => clearInterval(t);
  }, []);

  const register = async () => {
    try {
      await api("/register", {
        method: "POST",
        body: JSON.stringify({ roll, email, password }),
      });
      showMsg("Registration successful. Please login.", "success");
      setView("login");
    } catch (e) {
      showMsg(e.message || "Registration failed", "error");
    }
  };

  const login = async () => {
    try {
      await api("/login", {
        method: "POST",
        body: JSON.stringify({ roll, password, adminKey: adminKey || undefined }),
      });
      showMsg("OTP sent to your email. Check your inbox.", "success");
      setView("otp");
    } catch (e) {
      showMsg(e.message || "Login failed", "error");
    }
  };

  const verifyOtp = async () => {
    try {
      const data = await api("/verify-otp", {
        method: "POST",
        body: JSON.stringify({ roll, otp }),
      });
      setToken(data.token);
      setRole(data.role);
      setView(data.role === "admin" ? "admin" : "vote");
      showMsg("Signed in successfully.", "success");
    } catch (e) {
      showMsg(e.message || "Invalid OTP", "error");
    }
  };

  const vote = async (candidate) => {
    try {
      await api("/vote", {
        method: "POST",
        body: JSON.stringify({ candidate }),
      });
      showMsg("Your vote has been recorded.", "success");
      setView("done");
    } catch (e) {
      showMsg(e.message || "Vote failed", "error");
    }
  };

  const loadResults = async () => {
    try {
      const data = await api("/results");
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      showMsg(e.message || "Cannot load results", "error");
    }
  };

  const announceResults = async () => {
    try {
      const data = await api("/announce-results", { method: "POST" });
      setResults(Array.isArray(data.results) ? data.results : data.results || []);
      await loadAnnounced();
      showMsg("Results announced successfully.", "success");
    } catch (e) {
      showMsg(e.message || "Announce failed", "error");
    }
  };

  const seedAdmin = async () => {
    try {
      const data = await fetch(API + "/seed-admin", { method: "POST" }).then(r => r.json());
      showMsg(`Admin: ${data.roll} / ${data.password}, Admin Key: ${data.adminKey}`, "success");
    } catch {
      showMsg("Seed failed or admin exists.", "error");
    }
  };

  return (
    <div className="app">
      <style>{`
        .app { max-width: 560px; margin: 0 auto; padding: 24px; font-family: system-ui, sans-serif; }
        .card { background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
        h1 { margin: 0 0 8px; font-size: 1.5rem; color: #eee; }
        .sub { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
        input { width: 100%; padding: 12px; margin: 8px 0; border: 1px solid #333; border-radius: 8px; background: #0f0f1a; color: #fff; box-sizing: border-box; }
        button { padding: 10px 18px; margin: 4px 6px 4px 0; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-pri { background: #4361ee; color: #fff; }
        .btn-sec { background: #3a3a5c; color: #ccc; }
        .btn-danger { background: #e63946; color: #fff; }
        .msg { padding: 10px; border-radius: 8px; margin-bottom: 12px; }
        .msg.success { background: #1b4332; color: #95d5b2; }
        .msg.error { background: #5c1a1a; color: #f8ad9d; }
        .msg.info { background: #1d3557; color: #a8dadc; }
        ul.results { list-style: none; padding: 0; margin: 0; }
        ul.results li { padding: 10px; background: #16213e; border-radius: 8px; margin: 6px 0; display: flex; justify-content: space-between; }
        .badge { background: #4361ee; padding: 2px 8px; border-radius: 6px; font-size: 0.85rem; }
        .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
        .tabs button { flex: 1; }
      `}</style>

      <div className="card">
        <h1>University Voters Portal</h1>
        <p className="sub">Secure digital elections — MFA, access control, encryption</p>
        {message.text && (
          <div className={`msg ${message.type}`}>{message.text}</div>
        )}

        {view === "welcome" && (
          <>
            <div className="tabs">
              <button className="btn-pri" onClick={() => setView("login")}>Login</button>
              <button className="btn-sec" onClick={() => setView("register")}>Register</button>
            </div>
            <button className="btn-sec" onClick={seedAdmin}>Seed Admin (dev)</button>
            {announced && announced.announced && (
              <div className="card" style={{ marginTop: 16 }}>
                <h3>Announced Results</h3>
                <ul className="results">
                  {announced.results.map((r, i) => (
                    <li key={i}><span>{r._id}</span><span className="badge">{r.count} votes</span></li>
                  ))}
                </ul>
                <p className="sub">Announced at: {announced.announcedAt}</p>
              </div>
            )}
          </>
        )}

        {view === "login" && (
          <>
            <input placeholder="Roll No" value={roll} onChange={e => setRoll(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <input placeholder="Admin Key (admin only, leave blank for student)" value={adminKey} onChange={e => setAdminKey(e.target.value)} />
            <div style={{ marginTop: 12 }}>
              <button className="btn-pri" onClick={login}>Login</button>
              <button className="btn-sec" onClick={() => setView("welcome")}>Back</button>
            </div>
          </>
        )}

        {view === "register" && (
          <>
            <input placeholder="Roll No" value={roll} onChange={e => setRoll(e.target.value)} />
            <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <div style={{ marginTop: 12 }}>
              <button className="btn-pri" onClick={register}>Register</button>
              <button className="btn-sec" onClick={() => setView("welcome")}>Back</button>
            </div>
          </>
        )}

        {view === "otp" && (
          <>
            <input placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
            <div style={{ marginTop: 12 }}>
              <button className="btn-pri" onClick={verifyOtp}>Verify OTP</button>
              <button className="btn-sec" onClick={() => setView("login")}>Back</button>
            </div>
          </>
        )}

        {view === "vote" && (
          <>
            <p className="sub">Select a candidate (one vote per user)</p>
            {candidates.map(c => (
              <button key={c} className="btn-pri" style={{ display: "block", width: "100%", marginBottom: 8 }} onClick={() => vote(c)}>{c}</button>
            ))}
            <button className="btn-sec" onClick={() => { setToken(""); setRole(""); setView("welcome"); }}>Logout</button>
          </>
        )}

        {view === "admin" && (
          <>
            <p className="sub">Admin: view vote count and announce results</p>
            <button className="btn-pri" onClick={loadResults}>View Vote Count</button>
            <button className="btn-pri" onClick={announceResults}>Announce Results</button>
            {results.length > 0 && (
              <ul className="results" style={{ marginTop: 16 }}>
                {results.map((r, i) => (
                  <li key={i}><span>{r._id}</span><span className="badge">{r.count}</span></li>
                ))}
              </ul>
            )}
            <button className="btn-sec" style={{ marginTop: 12 }} onClick={() => { setToken(""); setRole(""); setView("welcome"); }}>Logout</button>
          </>
        )}

        {view === "done" && (
          <>
            <p className="sub">You have already voted. Results will be visible after the admin announces them.</p>
            {announced && announced.announced && (
              <ul className="results">
                {announced.results.map((r, i) => (
                  <li key={i}><span>{r._id}</span><span className="badge">{r.count} votes</span></li>
                ))}
              </ul>
            )}
            <button className="btn-sec" onClick={() => { setToken(""); setView("welcome"); }}>Back to Home</button>
          </>
        )}
      </div>
    </div>
  );
}

window.VotingPortal = VotingPortal;
