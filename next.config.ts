import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Exclude scripts folder from compilation
    config.module.rules.push({
      test: /\.ts$/,
      exclude: [
        path.resolve(__dirname, 'scripts'),
        /scripts[\\/]/,
      ],
    });
    
    return config;
  },
};

export default nextConfig;

