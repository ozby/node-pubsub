import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import path from "path";
import fs from 'fs';
import dotenv from 'dotenv';

// Load root .env file
const rootEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

export default defineConfig(({ mode }) => {
  // Load env files from Vite project directory
  const env = loadEnv(mode, process.cwd(), '');
  
  // Priority: Vite project .env, then root .env, then default
  const CLIENT_PORT = env.VITE_CLIENT_PORT || '3000';
  
  return {
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@repo/ui': path.resolve(__dirname, '../../packages/ui/src')
      }
    },
    server: {
      port: parseInt(CLIENT_PORT, 10),
      fs: {
        cachedChecks: false
      }
    }
  };
});
