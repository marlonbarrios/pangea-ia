const webpack = require("webpack");

/** Frozen when Next loads this file (each `next build` / dev server start = new stamp). */
const APP_BUILD_TIME_ISO = new Date().toISOString();
const APP_GIT_SHA_SHORT =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
  process.env.GITHUB_SHA?.slice(0, 7) ||
  "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  /** Server / tooling; client bundle also gets these via DefinePlugin below. */
  env: {
    NEXT_PUBLIC_APP_BUILD_TIME_ISO: APP_BUILD_TIME_ISO,
    NEXT_PUBLIC_APP_GIT_SHA: APP_GIT_SHA_SHORT,
  },
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
          // Merge deploy stamp into client env (DefinePlugin replaced whole process.env).
          "process.env": JSON.stringify({
            ...process.env,
            NEXT_PUBLIC_APP_BUILD_TIME_ISO: APP_BUILD_TIME_ISO,
            NEXT_PUBLIC_APP_GIT_SHA: APP_GIT_SHA_SHORT,
          }),
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
