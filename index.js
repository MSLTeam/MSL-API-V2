const express = require('express');
const app = express(); //创建express app
const pathModule = require('path');
const logger = require('./module/logger.js'); //日志工具
const cron = require('node-cron');
const {syncTask, syncInfo} = require('./module/schedule');
const packageDetails = require('./package.json');
const moment = require("moment/moment");
const parser = require("cron-parser");
const api = require('./module/api');//api路由引用
const crypto = require('crypto');
const config = require("./config");
const fs = require("fs");
const rateLimit = require('express-rate-limit');
const accessLog = require('./module/accessLog');

let path = ''
if (config.NODE_TLS_REJECT_UNAUTHORIZED === true) {
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

//记录访问日志
accessLog.openDb();
accessLog.createTable();
api.openDb();

//速率限制器
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    max: 100, // 限制每个 IP 每分钟只能发送 100 个请求
    message: 'Too many requests, please try again later.',
});
//获取正确ip
app.set('trust proxy', true);

// 将速率限制器应用于所有路由
app.use(limiter);

app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
    const date = moment().format('DD/MMM/YYYY:HH:mm:ss ZZ');
    const method = req.method;
    const url = req.url;
    const userAgent = req.headers['user-agent'];

    // 监听 res 的 'finish' 事件，这个事件会在响应结束时触发
    res.on('finish', () => {
        const status = res.statusCode;
        const message = `${ip} - - [${date}] "${method} ${url} HTTP/1.1" ${status} - "-" "${userAgent}"`;

        // 插入日志到数据库
        accessLog.insertLog(ip, method, url, status, date, userAgent);
        // 在控制台输出日志信息
        logger.info('访问日志：' + message);
    });

    next();
});


//如果path为空，那么调用工作路径
if (config.path === '') {
    path = __dirname;
} else {
    path = config.path;
}

//根路由，访问返回运行状态
app.get('/', (req, res) => {
    if (syncInfo.lastTime === '') {
        let interval = parser.parseExpression(config.taskCron);
        let nextTime = interval.next().toDate();
        nextTime = moment(nextTime).utcOffset(8).format();
        res.status(200).json({
            status: 200,
            lastTime: 'undefined',
            nextTime: nextTime,
            times: syncInfo.times,
            cron: config.taskCron,
            working: syncInfo.working
        });
    } else {
        res.status(200).json({
            status: 200,
            lastTime: syncInfo.lastTime,
            nextTime: syncInfo.nextTime,
            times: syncInfo.times,
            cron: config.taskCron,
            working: syncInfo.working
        });
    }

});


app.get('/run', function (req, res) {
    const ts = req.query.ts;
    const sign = req.query.sign;
    // 检查时间戳是否在10秒内
    const now = Math.floor(Date.now() / 1000);
    if (now - ts > 10) {
        res.status(403).json({
            status: 403,
            msg: 'Ts error！'
        });
        return;
    }
    // 检查签名是否正确
    const md5 = crypto.createHash('md5');
    const expectedSign = md5.update(ts + config.apiToken).digest('hex');
    if (sign !== expectedSign) {
        res.status(403).json({
            status: 403,
            msg: 'sign error!'
        });
        return;
    }
    if (syncInfo.working === true) {
        res.status(200).json({
            status: 200,
            msg: 'there is already a task in progress!'
        });
    } else {
        res.status(200).json({
            status: 200,
            msg: 'ok!'
        });
        syncTask(config.taskCron, path);
    }

});

//检查静态文件的文件夹是否存在
if (!fs.existsSync(path + '/public')) {
    fs.mkdirSync(path + '/public', {recursive: true});
}


//api路由
app.get('/stat/count', api.getStatCount);
app.get('/query/available_server_types', api.availableServerTypes(path + '/resources/servers_index.json')); //获取可用的服务器类型
app.get('/query/servers_description/:server', api.getServerDescription(path + '/resources/servers_index.json'));
app.get('/query/server_classify', api.serverClassify(path + '/resources/servers_index.json'));
app.get('/query/available_versions/:server', api.getAvailableVersions(path + '/resources/servers_index.json'));
app.get('/download/server/:server/:version', api.downloadServer(path + '/resources/servers_index.json'));
app.get('/query/MSLFrps', api.getFrp(path + '/resources/frps.json'));
app.get('/query/MSLFrps/notice', api.getNoticeMSLFrp(path + '/resources/frpc.json'));
app.get('/query/update', api.getLatestVersion(path + '/resources/msl.json'));
app.get('/query/update/log', api.getUpdateLog(path + '/resources/msl.json'));
app.get('/download/update', api.downloadLatestVersion(path + '/resources/msl.json'));
app.get('/query/notice/main', api.getNoticeMain(path + '/resources/msl.json'));
app.get('/query/notice/id', api.getNoticeID(path + '/resources/msl.json'));
app.get('/query/notice/tips', api.getNoticeTIPS(path + '/resources/msl.json'));
app.get('/query/cf_token', api.getCFToken(path + '/resources/cruseforgetoken.json'));
app.get('/query/java', api.getZuluVersions(path + '/res/java.json'));
app.get('/download/java/:ver', api.downloadJava(path + '/res/java.json'));
app.get('/download/frpc/:source/:platform', api.downloadFrp(path + '/resources/frpc.json'));
app.use('/files', express.static(path + '/servers'));
app.use('/public', express.static(path + '/public'));

//监听端口
app.listen(config.port, () => {
    logger.info(`Auto Sync MC Server 服务启动成功!监听端口:${config.port} 版本:${packageDetails.version}`);
});

//关掉数据库
process.on('SIGINT', function () {
    accessLog.closeDb();
    process.exit();
});

//定时执行同步
syncTask(config.taskCron, path); //程序执行时，立即进行一次同步
cron.schedule(config.taskCron, () => syncTask(config.taskCron, path));//定时计划

//访问不存的路由时，返回404
app.use(function (req, res, next) {
    res.status(404).send(`
<html lang="zh">
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>MSL-API</center>
</body>
</html>
  `);
});


//:?
logger.info('\n⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣤⣶⣶⣤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣾⠿⠛⠋⠉⠩⣄⠘⢿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⡏⠑⠒⠀⠀⣀⣀⠀⠀⢹⠈⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣷⡀⢀⣰⣿⡿⣿⣧⠀⠀⢡⣾⣧⣀⣀⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⣿⣿⣿⣿⣯⣴⣿⠿⣄⣤⣾⡿⠟⠛⠛⠿⢿⣶⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣴⣶⠿⠛⠋⠙⣿⣏⠀⠀⢻⣿⣡⣀⣀⠀⠀⠀⠀⢹⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣠⣾⠿⠋⠁⠀⣀⣤⣶⣾⣿⣿⣤⣤⣾⣿⠉⠉⠙⠻⣿⠆⢀⣾⡿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⡿⠋⠁⠀⣀⣴⣿⠿⠛⠉⠀⢀⣿⡿⠿⠟⢿⣆⠀⢀⣴⣯⣴⣿⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⣠⡾⠋⠀⠀⣠⣾⠟⠋⠀⠀⠀⠀⠀⣈⣿⣷⣤⣴⣾⣿⣈⣻⣿⡟⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⣰⡿⠁⠀⣠⡾⠋⠁⠀⠀⢀⣠⣴⠶⠞⠛⠛⠋⠉⠉⠉⠉⠙⠛⠻⠷⣦⣤⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠰⣿⠁⠀⠀⣿⣄⣀⣠⣴⡾⠛⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⣿⠿⣶⣄⠀⠀⠀⢀⣠⡄⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠈⠛⠶⠶⢾⣿⠿⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢷⣄⠉⠙⠻⠿⠟⢹⡇⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⠟⠁⠀⠀⠀⠀⠀⠀⠀⢀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣄⠀⠀⠀⠀⠘⣿⣿⣦⣀⠀⠲⣾⣁⠀⠀⠀⠀⠀⡀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⢀⡾⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣦⡀⠀⠀⠀⣿⡿⣿⣿⣿⡆⠀⠉⠛⠛⠛⠛⢻⡏⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⣠⡾⠁⠀⠀⠀⠀⠀⠀⠀⠀⢀⡄⣸⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣿⠛⢦⡀⠰⣿⣿⣿⣽⣿⡇⠀⠀⠀⠀⠀⢠⡿⠀⠀\n' +
    '⠀⠀⠀⠀⣀⣤⡾⢻⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⠀⡏⠙⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠰⣽⣶⣄⠉⠻⣿⣿⣧⠀⠀⢀⣤⣾⠟⠁⠀⠀\n' +
    '⢰⣶⡾⠛⠋⠉⠀⠀⠀⠀⠀⢀⡀⠀⠀⠀⠀⠀⢸⣸⡇⠀⣨⣿⣾⡋⠀⠀⠀⠀⢀⠀⠀⣿⡀⠀⠈⠛⢷⣄⠈⠛⣿⡆⠀⠘⣿⡀⠀⠀⠀⠀\n' +
    '⠀⠙⠿⣦⣀⠀⠀⠀⠀⠀⠀⡾⠀⠀⠀⠀⠀⠀⣿⣿⠀⠀⠋⠀⠙⢿⣦⣀⠀⠀⠘⣷⣄⣹⣧⠀⠀⠀⠈⢻⣦⠀⠈⠋⠀⠀⠘⣧⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠈⠛⠿⢶⡶⠃⠀⣰⠃⠀⠀⠀⠀⠀⢠⣿⠃⠀⠀⠀⠀⠀⠀⠉⠻⢷⣦⣤⣘⣿⡛⠛⠀⢀⣴⣶⣦⡹⣷⡀⠀⠀⠀⠀⠸⣧⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⢠⡿⠃⠀⢀⡟⠀⠀⠀⠀⠀⠀⣼⣿⠀⠀⢀⣴⣿⣿⣷⡄⠀⠀⠈⠉⠉⠉⠉⠀⠀⢸⣿⣿⣿⣷⠻⣧⠀⠀⠀⠀⠀⢿⡆⠀⠀\n' +
    '⠀⠀⠀⠀⢰⣿⠁⠀⠀⢸⠁⠀⠀⠀⠀⠀⠈⠋⣿⠀⠀⠸⣿⣿⣿⣿⡷⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠿⠟⠃⠀⢻⣧⠀⠀⠀⠀⠸⣧⠀⠀\n' +
    '⠀⠀⠀⠀⣿⡇⠀⠀⠀⣿⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⠀⠀⠉⠻⠿⠋⠀⠀⢠⡀⠀⠀⣀⣀⣀⣸⠇⠀⠀⠀⠀⠀⠈⢿⣧⠀⠀⠀⠀⣿⡀⠀\n' +
    '⠀⠀⠀⢰⣿⠁⠀⠀⢰⡏⠀⠀⠀⠀⠀⠀⠀⠀⢿⡀⠀⠀⠀⠀⠀⣸⠀⠀⠈⠛⠒⠛⠉⠈⠉⠀⠀⠀⠀⠀⠀⠀⠀⢸⡟⠀⠀⠀⠀⢸⡇⠀\n' +
    '⠀⠀⠀⢸⣿⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⢸⡇⠀⠀⠀⠀⠚⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⠁⠀⠀⠀⠀⢸⣿⠀\n' +
    '⠀⠀⠀⢸⣿⠀⠀⠀⢸⡇⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣀⣀⣀⣤⣶⡿⠋⣿⠀⠀⠀⠀⠀⠀⣿⠀\n' +
    '⠀⠀⠀⠘⣿⡄⠀⠀⢸⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣧⣄⣀⣀⣀⣠⣤⣶⣶⣾⣿⣿⣿⣿⠿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀⠀⣠⠀⠀⢠⣿⡄\n' +
    '⠀⠀⠀⠀⢻⣧⠀⠀⠸⣿⡀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣿⣿⣿⣟⠛⢻⡟⢻⡉⠉⣫⣀⠀⠀⠀⠉⠉⠛⠙⠿⣷⣿⡿⠁⢀⣰⡟⠀⠀⢸⣿⠀\n' +
    '⠀⠀⠀⠀⠈⢻⣧⡀⠀⠹⣷⡀⠀⠀⠀⠀⢠⠀⠀⠀⠘⣿⣿⣿⢻⡿⠀⠈⠷⠟⠁⠘⢾⣿⣶⣤⣶⣾⡇⠀⣿⣿⣤⣶⣿⣿⠃⠀⠀⣾⡟⠀\n' +
    '⠀⠀⠀⠀⠀⠈⠻⣷⣄⡀⠹⣷⣄⠀⠀⠀⢸⣷⣤⡀⠀⠈⢻⣿⣯⣤⠀⠀⣠⡀⠀⢀⣼⣿⣿⣿⣿⣟⠁⠐⠿⣿⣿⣿⣿⠋⠀⢀⣾⠟⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠈⠙⠿⣷⣮⣽⣷⣶⣤⣤⣿⣿⣿⣷⣶⣦⣭⣿⣿⣧⣠⠵⢯⡆⠚⣯⢿⠋⠛⠛⢫⣀⣠⣾⣿⢿⣿⣥⣤⠶⠛⠁⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠉⢁⣾⣿⣿⣿⠿⠿⠿⠿⠻⢿⣿⣿⣷⣦⣤⣤⣀⣤⣤⣄⣶⣿⣿⡿⠟⠉⠀⠀⢻⡄⠀⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⡇⠀⠀⣀⡀⠈⢿⣧⠀⠉⠙⠛⠛⠛⠛⠛⠛⠉⠁⠀⠀⠀⠀⠀⠀⢿⡄⠀⠀⠀⠀⠀⠀\n' +
    '⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣀⣴⣿⣿⡏⠛⠉⢻⣿⣿⣿⣾⣿⣿⠀⢸⣿⠀⠀⠀⠀⠀⠙⠓⠢⠀⠀⠀⠀⠀⠸⠀⠀⠀⠘⣿⡄⠀⠀⠀⠀⠀')

