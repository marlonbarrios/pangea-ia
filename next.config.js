const webpack = require("webpack");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        os: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        zlib: false,
        net: false,
        tls: false,
        child_process: false,
        worker_threads: false,
        perf_hooks: false,
        async_hooks: false,
      };

      config.plugins.push(
        new webpack.DefinePlugin({
          global: "globalThis",
          "process.env": JSON.stringify(process.env),
          "process.version": JSON.stringify(process.version),
          "process.platform": JSON.stringify("browser"),
          "process.nextTick": "setTimeout",
        })
      );

      config.plugins.push(
        new webpack.ProvidePlugin({
          process: "process/browser",
          Buffer: ["buffer", "Buffer"],
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
