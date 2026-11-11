import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  experimental: {
    // Logo uploads in /admin/emails/logos (up to 2 MB each).
    serverActions: { bodySizeLimit: "3mb" },
  },
  images: {
    // YouTube thumbnails for the lazy video facades on the annual event page.
    remotePatterns: [new URL("https://i.ytimg.com/vi/**")],
  },
};

// Vercel BotID: proxies its challenge scripts through this site.
export default withBotId(nextConfig);
