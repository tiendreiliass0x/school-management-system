module.exports = {
  apps: [
    {
      name: 'nextjs-frontend',
      script: 'npm',
      args: 'start',
      cwd: './frontend',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
    {
      name: 'bun-backend',
      script: 'bun',
      args: 'run ./dist/index.js',
      cwd: './backend',
      interpreter: 'bun',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080,
      },
    },
  ],
};