import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Friendly redirects to the static dashboard hosted under public/
  async redirects() {
    return [
      // Default: standalone (current) version
      { source: "/dashboard/cpee", destination: "/dashboard-cpee/standalone.html", permanent: false },
      { source: "/cpee", destination: "/dashboard-cpee/standalone.html", permanent: false },
      // Legacy multi-file version still reachable
      { source: "/dashboard/cpee/v1", destination: "/dashboard-cpee/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
