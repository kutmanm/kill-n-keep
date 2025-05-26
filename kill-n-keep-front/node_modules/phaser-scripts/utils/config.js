const fs = require('fs');
const path = require('path');

module.exports = {
  publicPath: path.resolve(process.cwd(), './public'),
  PORT: process.env.PORT || 8080,
  HOST: process.env.HOST || 'localhost',
  HTTPS: process.env.HTTPS || false,
  USE_YARN: fs.existsSync(path.join(process.cwd(), 'yarn.lock')),
};
