import { useEffect, useState } from "react";
export default function BootProbe() {
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(true); console.log("[BootProbe] montado"); }, []);
  return (
    <div style={{
      position:"fixed", top:8, right:8, zIndex:99999,
      padding:"6px 8px", border:"2px solid #2e7d32",
      background:"#e8f5e9", font:"12px monospace"
    }}>
      Boot: {ok ? "OK" : "..."}
    </div>
  );
}
