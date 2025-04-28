module.exports = {
  apps: [
    {
      name: "weneedwax",
      script: "./server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        RESEND_API_KEY: "re_8sgGKoV4_FDs2SgkwVZ41fWqDrXoTkpsE"
      }
    }
  ]
};
