module.exports = {
  apps: [
    {
      name: "neotropical-app",
      script: ".next/standalone/Neotropical-Specimens-Native/server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        PORT: 3001,
        NODE_ENV: "production"
      }
    }
  ]
};
