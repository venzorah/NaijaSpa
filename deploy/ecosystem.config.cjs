const path = require("node:path");
const appDir = process.env.NAIJASPA_APP_DIR || path.resolve(__dirname, "..");

module.exports = {
  apps: [
    {
      name: "naijaspa-web",
      cwd: appDir,
      script: path.join(appDir, "node_modules/next/dist/bin/next"),
      args: "start --hostname 127.0.0.1 --port 3100",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 3000,
      max_memory_restart: "768M",
      node_args: "--max-old-space-size=512",
      time: true,
      env: { NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1" }
    },
    {
      name: "naijaspa-notifications",
      cwd: appDir,
      script: path.join(appDir, "scripts/notification-worker.mjs"),
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      restart_delay: 10000,
      max_memory_restart: "128M",
      time: true,
      env: { NODE_ENV: "production" }
    }
  ]
};
