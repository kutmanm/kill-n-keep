const chalk = require('chalk');
const path = require('path');
const { publicPath } = require('../utils/config');
const fileSize = require('./fileSize');

module.exports = {
  before: () => {
    console.log('Creating an optimized production build...');
  },
  error: ({ stats }) => {
    const { errors } = stats.toJson({ all: false, warnings: true, errors: true });
    console.error(chalk.red('Failed to compile'));


    errors.forEach((error) => {
      const [fileName, ...errorMessage] = error.split('\n');

      console.log('');
      console.log(chalk.bgWhite.black(fileName));
      console.log(errorMessage.join('\n'));
    });

    console.log('\n');
  },
  after: ({ stats }) => {
    if (stats.hasWarnings()) {
      console.log(chalk.yellow('Compiled successfully with following warnings:'));
      const { warnings } = stats.toJson({ warnings: true });

      console.log('\n');

      warnings.forEach((warning) => {
        console.log(chalk.yellow(warning));
      });
    } else {
      console.log(chalk.green('Compiled successfully.'));
    }

    const { assets } = stats.toJson({ all: false, assets: true });

    let longestSizeText = -1;

    console.log('\nFile sizes:\n');

    [...assets]
      .map((asset) => {
        const folder = path.join(
          path.basename(publicPath),
          path.dirname(asset.name),
        );

        const sizeText = fileSize(asset.size);

        longestSizeText = Math.max(longestSizeText, sizeText.length);

        return {
          size: asset.size,
          sizeText,
          name: `${chalk.dim(`${folder}${path.sep}`)}${chalk.cyan(path.basename(asset.name))}`,
        };
      })
      .sort((assetA, assetB) => assetB.size - assetA.size)
      .forEach((asset) => {
        const sizeText = asset.sizeText.padEnd(longestSizeText, ' ');
        console.log(`  ${sizeText}   ${asset.name}`);
      });

    console.log('\n');
  },
};
