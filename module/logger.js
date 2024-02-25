const chalk = require('chalk');
const moment = require('moment');

const logger = {
    info: (message) => {
        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}][${chalk.blue('INFO')}] ${message}`);
    },
    warn: (message) => {
        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}][${chalk.yellow('WARN')}] ${message}`);
    },
    error: (message) => {
        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}][${chalk.red('ERROR')}] ${message}`);
    },
    debug: (message) => {
        console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}][${chalk.green('DEBUG')}] ${message}`);
    }
};

module.exports = logger;
