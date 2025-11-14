import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Exclude scripts folder from TypeScript compilation
    const scriptsPath = path.resolve(__dirname, 'scripts');
    
    // Modify existing TypeScript rules to exclude scripts folder
    config.module.rules = config.module.rules.map((rule: any) => {
      if (rule.test && rule.test.toString().includes('tsx?') && rule.exclude) {
        // Add scripts folder to existing exclude
        const existingExclude = Array.isArray(rule.exclude) 
          ? rule.exclude 
          : [rule.exclude];
        rule.exclude = [...existingExclude, scriptsPath, /scripts[\\/]/];
      } else if (rule.test && rule.test.toString().includes('tsx?')) {
        // Add exclude if it doesn't exist
        rule.exclude = [scriptsPath, /scripts[\\/]/];
      }
      return rule;
    });
    
    return config;
  },
};

export default nextConfig;

