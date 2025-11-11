// next.config.ts
import type { NextConfig } from "next";

const BACKEND_ORIGIN =
  process.env.NEXT_PUBLIC_BACKEND_ORIGIN || "http://127.0.0.1:8000";

let proto: "http" | "https" = "http";
let host = "127.0.0.1";
let port: string | undefined = "8000";
try {
  const u = new URL(BACKEND_ORIGIN);
  proto = (u.protocol.replace(":", "") as "http" | "https") || "http";
  host = u.hostname || "127.0.0.1";
  port = u.port || undefined;
} catch {}

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: proto, hostname: host, port, pathname: "/storage/**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/storage/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "8000", pathname: "/storage/**" },
      // ⬅️ pas de CIDR ici (Next ne supporte que des hostnames explicites)
    ],
  },
  experimental: {
    allowedDevOrigins: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://192.168.1.176:3000", // ton IP LAN vue dans les logs
    ],
  },
  async rewrites() {
    return [
      { source: "/api/:path*",      destination: `${BACKEND_ORIGIN}/api/:path*` },
      { source: "/storage/:path*",  destination: `${BACKEND_ORIGIN}/storage/:path*` },
    ];
  },
};

export default nextConfig;
