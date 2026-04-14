/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  serverExternalPackages: ["puppeteer"],
  transpilePackages: [
    "platejs",
    "@platejs/basic-nodes",
    "@platejs/list",
    "@platejs/link",
    "@platejs/media",
    "@platejs/markdown",
    "@platejs/slash-command",
    "@platejs/floating",
    "@platejs/autoformat",
    "@platejs/core",
    "@platejs/slate",
    "@platejs/utils",
    "@platejs/combobox",
    "@platejs/caption",
  ],
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
