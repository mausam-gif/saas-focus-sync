import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["frappe-gantt"],
  turbopack: {},
};

export default withPWA(nextConfig);
