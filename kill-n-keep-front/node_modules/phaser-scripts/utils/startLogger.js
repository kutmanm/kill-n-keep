const chalk = require('chalk');
const ip = require('ip');
const url = require('url');
const clearConsole = require('../utils/clearConsole');
const {
  PORT, USE_YARN, HOST, HTTPS,
} = require('../utils/config');

const appName = 'test';
const urls = {
  localUrlForTerminal: url.format({
    protocol: HTTPS ? 'https' : 'http',
    hostname: HOST,
    port: chalk.bold(PORT),
    pathname: '/',
  }),
  lanUrlForTerminal: url.format({
    protocol: HTTPS ? 'https' : 'http',
    hostname: ip.address(),
    port: chalk.bold(PORT),
    pathname: '/',
  }),
};
const isInteractive = process.stdout.isTTY;

module.exports = {
  before: () => {
    if (isInteractive) {
      clearConsole();
    }

    console.log(chalk.cyan('Starting the development server...'));
  },
  compiling: () => {
    if (isInteractive) {
      clearConsole();
    }

    console.log('Compiling...');
  },
  done: (stats) => {
    clearConsole();

    if (stats.hasErrors()) {
      const { errors } = stats.toJson({ all: false, warnings: false, errors: true });
      console.error(chalk.red('Failed to compile'));

      errors.forEach((error) => {
        const [fileName, ...errorMessage] = error.split('\n');

        console.log('');
        console.log(chalk.bgWhite.black(fileName));
        console.log(errorMessage.join('\n'));
      });

      return console.log('\n');
    }

    if (stats.hasWarnings()) {
      const { errors } = stats.toJson({ all: false, warnings: true, errors: false });
      console.error(chalk.red('Compiled with warnings'));

      errors.forEach((error) => {
        const [fileName, ...errorMessage] = error.split('\n');

        console.log('');
        console.log(chalk.bgWhite.black(fileName));
        console.log(errorMessage.join('\n'));
      });

      return console.log('\n');
    }

    console.log(chalk.green('Compiled successfully!'));

    console.log();
    console.log(`You can now view ${chalk.bold(appName)} in the browser.`);
    console.log();

    if (urls.lanUrlForTerminal) {
      console.log(
        `  ${chalk.bold('Local:')}            ${urls.localUrlForTerminal}`,
      );
      console.log(
        `  ${chalk.bold('On Your Network:')}  ${urls.lanUrlForTerminal}`,
      );
    } else {
      console.log(`  ${urls.localUrlForTerminal}`);
    }

    console.log();
    console.log('Note that the development build is not optimized.');
    console.log(
      'To create a production build, use '
        + `${chalk.cyan(`${USE_YARN ? 'yarn' : 'npm run'} build`)}.`,
    );
    return console.log();
  },
};
