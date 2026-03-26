require("dotenv").config({ path: ".env.production" });
require("dotenv").config({ path: ".env", override: false });

module.exports = {
  apps: [
    {
      name: "jenkins-fear-not",
      // 关键改动：直接用 node 启动，让 PM2 彻底掌控集群句柄
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max", // 先改成 2 个，稳定后再考虑更多
      exec_mode: "cluster",
      cwd: "/var/www/jenkins-fear-not/current",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        AUTH_URL: process.env.AUTH_URL,
        AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
      },
      // 增加监听就绪，防止 reload 过程中新老进程打架
      wait_ready: true,
      listen_timeout: 3000,
    },
  ],
};
