const path = require("path");

module.exports = {
  apps: [
    {
      name: "weneedwax",
      cwd: path.join(__dirname, ".."),
      script: "server/server.js",
      watch: false,
      env_file: ".env",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
