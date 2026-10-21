/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: { appIsrStatus: false, buildActivity: false },
  async rewrites() {
    return [{ source: "/api/:path*", destination: "http://localhost:8000/api/:path*" }];
  },
};
export default nextConfig;
