/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["yt-dlp-exec", "puppeteer-core", "@sparticuz/chromium"],
  },
};

export default nextConfig;
