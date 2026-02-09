/** @type {import('next').NextConfig} */
const nextConfig = {
  // מתעלם משגיאות TypeScript בזמן הבנייה
  typescript: {
    ignoreBuildErrors: true,
  },
  // מתעלם משגיאות ESLint בזמן הבנייה
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;