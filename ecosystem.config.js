module.exports = {
  apps: [
    {
      name: "jenkins-object2workout",
      // 关键改动：直接用 node 启动，让 PM2 彻底掌控集群句柄
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: "max", // 先改成 2 个，稳定后再考虑更多
      exec_mode: "cluster",
      cwd: "/var/www/jenkins-object2workout/current",
      env: {
        PORT: 3001,
        NODE_ENV: "production",
      },
      // 增加监听就绪，防止 reload 过程中新老进程打架
      wait_ready: true,
      listen_timeout: 3000,
    },
  ],
};
