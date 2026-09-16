/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // required by the existing infra Dockerfile (multi-stage build copies .next/standalone)
  images: {
    formats: ["image/webp"],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
