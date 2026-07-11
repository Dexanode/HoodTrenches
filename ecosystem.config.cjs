module.exports = {
  apps: [
    {
      name: "hoodtrenches",
      script: "src/index.js",
      cwd: __dirname,
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      restart_delay: 5000,
      exp_backoff_restart_delay: 100,
      min_uptime: "10s",
      max_restarts: 20,
      time: true,
      merge_logs: true,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
