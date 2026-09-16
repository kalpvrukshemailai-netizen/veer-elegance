import type { NextConfig } from "next";

type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

const remotePatterns: RemotePattern[] = [
  {
    protocol: "https",
    hostname: "**.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
  {
    protocol: "https",
    hostname: "xbpvbwcodlcepexsmvhi.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
];

// If NEXT_PUBLIC_SUPABASE_URL is configured, add its hostname
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const parsed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const host = parsed.hostname;
    if (host && host !== "xbpvbwcodlcepexsmvhi.supabase.co") {
      remotePatterns.push({
        protocol: (parsed.protocol.replace(":", "") || "https") as "http" | "https",
        hostname: host,
        pathname: "/storage/v1/object/public/**",
      });
    }
  } catch {}
}

const nextConfig: NextConfig = {
  images: {
    qualities: [25, 50, 60, 70, 75, 80, 85, 88, 90, 100],
    remotePatterns,
  },
};

export default nextConfig;
