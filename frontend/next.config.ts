import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Friendly redirects to the static dashboard hosted under public/
  async redirects() {
    return [
      {
        source: "/dashboard/cpee",
        destination: "/dashboard-cpee/index.html",
        permanent: false,
      },
      {
        source: "/cpee",
        destination: "/dashboard-cpee/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
