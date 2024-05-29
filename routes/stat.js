const logger = require("../utils/logger");
const url = require("url");
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

function getStatCount(req, res) {
    const type = req.query.type;
    let date = new Date();
    if (type === 'all') {
        date.setDate(date.getDate() - 14);
    }
    const targetDate = date.toISOString().slice(0, 10);
    db.all(`SELECT url, COUNT(*) as count FROM log WHERE date(response_time) >= ? AND status != 404 GROUP BY url`, [targetDate], (err, rows) => {
        if (err) {
            logger.error(err.message);
            res.status(500).send(err.message);
        } else {
            //处理URL格式
            const routeCounts = {};
            rows.forEach(row => {
                const route = url.parse(row.url).pathname.split('/').slice(0, 3).join('/');
                if (routeCounts[route]) {
                    routeCounts[route] += row.count;
                } else {
                    routeCounts[route] = row.count;
                }
            });
            const routeRows = Object.keys(routeCounts).map(route => ({route, count: routeCounts[route]}));

            //获取指定日期范围内有多少不同的 IP
            db.all(`SELECT COUNT(DISTINCT ip) as ipCount FROM log WHERE date(response_time) >= ?`, [targetDate], (err, ipRows) => {
                if (err) {
                    logger.error(err.message);
                    res.status(500).send(err.message);
                } else {
                    const ipCount = ipRows[0].ipCount;
                    res.json({
                        totalCount: rows.reduce((sum, row) => sum + row.count, 0),
                        uniqueIPs: ipCount,
                        requests: routeRows
                    });
                }
            });
        }
    });
}

module.exports = {
    openDb,
    getStatCount,
};