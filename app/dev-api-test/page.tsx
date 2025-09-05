"use client";
import { useEffect, useState } from "react";

export default function DevApiTest() {
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    console.log("API_BASE =", process.env.NEXT_PUBLIC_API_BASE);
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE!;
        // ping l’API Laravel
        const r = await fetch(base + "/health", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setOut(j);
      } catch (e: any) {
        setErr(e?.message || "Erreur inconnue");
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="font-semibold mb-2">Dev API Test</h1>
      <div className="text-xs mb-2">
        Base: <code>{process.env.NEXT_PUBLIC_API_BASE}</code>
      </div>
      <pre className="p-3 bg-white border text-sm overflow-auto">
        {err || JSON.stringify(out, null, 2)}
      </pre>
    </div>
  );
}
