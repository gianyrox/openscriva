/** @type {import('next').NextConfig} */
const nextConfig = {
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
  webpack: function configureWebpack(config, { isServer }) {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push("puppeteer");
    }
    return config;
  },
};

export default nextConfig;
