/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      'jszip',
      'pdf-lib',
      'tesseract.js',
      'exifreader',
      'browser-image-compression'
    ]
  },
  reactStrictMode: true,
};

export default nextConfig;

