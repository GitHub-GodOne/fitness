module.exports = {
  apps: [
    {
      name: "jenkins-fear-not",
      script: "pnpm",
      args: "start",
      instances: "max",
      exec_mode: "cluster",
      cwd: "/var/www/jenkins-fear-not/current",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
      },
    },
  ],
};
