const webpack = require('webpack');
const buildLogger = require('../utils/buildLogger');
const prodConfigFactory = require('../webpack/prod');

module.exports = () => {
  process.env.NODE_ENV = 'production';

  const prodConfig = prodConfigFactory();
  const compiler = webpack(prodConfig);
  buildLogger.before();

  compiler.run((err, stats) => {
    if (err || stats.hasErrors()) {
      buildLogger.error({ stats });
      return process.exit(1);
    }

    return buildLogger.after({ errors: err, stats });
  });
};
