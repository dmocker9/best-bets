import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Turbopack configuration (Next.js 16+) - empty config to silence warning
  // Turbopack respects tsconfig.json exclusions, so scripts folder is already excluded
  turbopack: {},
  
  // Webpack configuration (fallback for non-Turbopack builds)
  webpack: (config) => {
    // Exclude scripts folder and utility scripts from TypeScript compilation
    const scriptsPath = path.resolve(__dirname, 'scripts');
    
    // Utility script patterns to exclude
    const utilityPatterns = [
      /restore-.*\.ts$/,
      /scrape-.*\.ts$/,
      /fetch-.*\.ts$/,
      /generate-.*\.ts$/,
      /update-.*\.ts$/,
      /fix-.*\.ts$/,
      /recalculate-.*\.ts$/,
      /regenerate-.*\.ts$/,
      /ensure-.*\.ts$/,
      /get-.*\.ts$/,
      /import-.*\.ts$/,
    ];
    
    // Modify existing TypeScript rules to exclude scripts folder and utility files
    config.module.rules = config.module.rules.map((rule: any) => {
      if (rule.test && rule.test.toString().includes('tsx?')) {
        const existingExclude = rule.exclude 
          ? (Array.isArray(rule.exclude) ? rule.exclude : [rule.exclude])
          : [];
        
        // Add comprehensive exclusions
        rule.exclude = [
          ...existingExclude,
          scriptsPath,
          /scripts[\\/]/,
          (filePath: string) => {
            // Exclude utility scripts in root
            const fileName = path.basename(filePath);
            return utilityPatterns.some(pattern => pattern.test(fileName));
          }
        ];
      }
      return rule;
    });
    
    return config;
  },
};

export default nextConfig;

// Build configuration
