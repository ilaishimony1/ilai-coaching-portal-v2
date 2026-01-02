import { useEffect, useState } from "react";
import { firebaseEngine } from "../firebaseEngine";

export default function TestFirebaseEngine() {
  const [status, setStatus] = useState("Testing connection...");

  useEffect(() => {
    firebaseEngine.testConnection().then((res) => {
      if (res.success) {
        setStatus("✅ Firebase connected successfully");
      } else {
        setStatus("❌ Firebase error: " + res.error);
      }
    });
  }, []);

  return (
    <div style={{ padding: 16, background: "#eee", borderRadius: 8 }}>
      <strong>Firebase Status:</strong>
      <div>{status}</div>
    </div>
  );
}
