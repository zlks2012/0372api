import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/api/v1/:path*", destination: "http://127.0.0.1:3000/api/v1/:path*" },
                { source: "/", destination: "/index.html" },
        
        { source: "/assets/:path*", destination: "/sites/emooo/:path*" },
        { source: "/assets/:path*.ttf", destination: "/fonts/:path*.ttf" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
