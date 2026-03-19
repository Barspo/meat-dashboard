/** @type {import('next').NextConfig} */
const nextConfig = {
  // מתעלם משגיאות TypeScript בזמן הבנייה
  typescript: {
    ignoreBuildErrors: true,
  },
  // מונע מ-Next.js לבנדל את pg — נדרש לחיבור תקין ב-Vercel serverless
  serverExternalPackages: ['pg'],
};

module.exports = nextConfig;