const logger = require("./logger");
const moment = require("moment");
const sqlite3 = require('sqlite3').verbose();

let db;

function openDb() {
    db = new sqlite3.Database('data.db', (err) => {
        if (err) {
            logger.error('访问日志数据库连接失败！' + err.message);
        }
        logger.info('成功连接到访问日志数据库！');
    });
}

function createTable() {
    db.run(`CREATE TABLE IF NOT EXISTS log (
        ip TEXT,
        method TEXT,
        url TEXT,
        status INTEGER,
        response_time INTEGER,
        ua TEXT
    )`);
}

function insertLog(ip, method, url, status, response_time, ua) {
    // 使用 moment 来解析 response_time
    const date = moment(response_time, 'DD/MMM/YYYY:HH:mm:ss ZZ').toISOString();
    db.run(`INSERT INTO log VALUES (?, ?, ?, ?, ?,?)`, [ip, method, url, status, date, ua], function (err) {
        if (err) {
            return logger.error(err.message);
        }
        // 在控制台输出日志信息
        logger.info(`记录访问数据，ID:${this.lastID}`);
    });
}

function closeDb() {
    db.close((err) => {
        if (err) {
            logger.error(err.message);
        }
        logger.info('关闭数据库连接！')
    });
}

function cleanLogs() {
    logger.info('开始清理日志！');
    const date = new Date();
    date.setDate(date.getDate() - 14);
    const fourteenDaysAgo = date.toISOString().slice(0, 10);
    db.get(`SELECT COUNT(*) as count FROM log WHERE date(response_time) < ?`, [fourteenDaysAgo], (err, row) => {
        if (err) {
            logger.error(err.message);
        } else {
            if (row.count > 0) {
                db.run(`DELETE FROM log WHERE date(response_time) < ?`, [fourteenDaysAgo], (err) => {
                    if (err) {
                        logger.error(err.message);
                    } else {
                        logger.info('成功清理日志！');
                    }
                });
            } else {
                logger.info('14天之前的日志不存在，不清理！');
            }
        }
    });
}


module.exports = {
    openDb,
    createTable,
    insertLog,
    closeDb,
    cleanLogs
};
