const path = require("path");

module.exports = {
  apps: [
    {
      name: "weneedwax",
      cwd: path.join(__dirname, ".."),
      script: "server/server.js",
      watch: false,
      env_file: "/home/ec2-user/weneedwax/.env",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
