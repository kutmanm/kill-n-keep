#!/usr/bin/env node

const yargs = require('yargs');

// eslint-disable-next-line no-unused-expressions
yargs
  .command('start', 'runs development sever', require('../scripts/start.js'))
  .command('build', '', require('../scripts/build.js'))
  .help()
  .argv;
