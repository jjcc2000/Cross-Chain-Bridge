"use client";
import { useState } from "react";

export default function StatusPanel() {
  const [msgId, setMsgId] = useState("");
  return (
    <div style={{ border: "1px solid #2a2a3a", borderRadius: 16, padding: 20 }}>
      <h2 style={{ marginBottom: 12 }}>Message Status</h2>
      <input
        placeholder="Message ID (CCIP)"
        value={msgId}
        onChange={(e) => setMsgId(e.target.value)}
        style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid #333", background: "#131324", color: "white" }}
      />
      <p style={{ opacity: 0.8, marginTop: 10 }}>
        🔎 Hook this up to your indexer later to poll by <code>msgId</code> and show PENDING / DELIVERED with tx links.
      </p>
    </div>
  );
}
