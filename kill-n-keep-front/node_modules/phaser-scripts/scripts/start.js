const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const baseConfigFactory = require('../webpack/base');
const startLogger = require('../utils/startLogger');
const { PORT, HOST, HTTPS } = require('../utils/config');

module.exports = () => {
  process.env.NODE_ENV = 'development';

  const baseConfig = baseConfigFactory();
  const compiler = webpack(baseConfig);

  compiler.hooks.invalid.tap('invalid', (stats) => {
    startLogger.compiling(stats);
  });

  compiler.hooks.done.tap('done', async (stats) => {
    startLogger.done(stats);
  });

  const server = new WebpackDevServer(compiler, {
    hot: true,
    inline: true,
    stats: { colors: true },
    clientLogLevel: 'none',
    quiet: true,
    overlay: false,
    https: HTTPS,
  });

  server.listen(PORT, HOST, () => {
    startLogger.before();
  });
};
