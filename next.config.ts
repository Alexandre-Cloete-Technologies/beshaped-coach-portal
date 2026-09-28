import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default function config(phase: string): NextConfig {
  // Emulator mode is for local dev only; a build with it on would ship a portal that talks to 127.0.0.1.
  if (phase === PHASE_PRODUCTION_BUILD && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
    throw new Error("NEXT_PUBLIC_USE_EMULATORS=true is not allowed in a production build.");
  }
  return nextConfig;
}
