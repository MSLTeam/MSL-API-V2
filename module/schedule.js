const logger = require("./logger");
const moment = require("moment");
const parser = require('cron-parser');
const {combineJson} = require("./combinejson");
const {outputJsonOfMirror, deleteFilesNow} = require("./fs");
const fs = require('fs');
const syncPaper = require('./sync/paper')
const syncPurpur = require("./sync/purpur");
const syncLeaves = require("./sync/leaves");
const jsonVanilla = require("./sync/vanilla");
const syncMohist = require("./sync/mohist");
const syncArclight = require('./sync/arclight')
const jsonSpigot = require("./sync/spigot");
const jsonBukkit = require("./sync/bukkit");
const jsonFabric = require("./sync/fabric");
const jsonForge = require("./sync/forge");
const syncCatserver = require("./sync/catserver");
const syncVelocity = require("./sync/velocity");
const syncFolia = require("./sync/folia");
const syncLightfall = require("./sync/lightfall");
const jsonBDS = require("./sync/bds");
const {checkUpdate} = require("./update");
const jsonNeoForge = require("./sync/neoforge");
const syncLeavesGithub = require("./sync/leaves-github");
const config = require("../config");
const syncJava = require("./sync/java");
const syncLocalJson = require("./syncLocalJson");
const {cleanLogs} = require("./accessLog");
const syncPufferfish = require("./sync/pufferfish");
const syncSpongeForge = require("./sync/spongeforge");
const syncSpongeVanilla = require("./sync/spongevanilla");
const syncTravertine = require("./sync/travertine");

const syncInfo = {
    lastTime: "",
    nextTime: "",
    times: 0,
    working: false
};

//执行定时任务
async function syncTask(taskCron, path) {
    if (syncInfo.working === false) {
        syncInfo.working = true;
        //获取当前时间
        syncInfo.lastTime = moment().utcOffset(8).format();
        //获取下一次的时间
        let interval = parser.parseExpression(taskCron);
        syncInfo.nextTime = interval.next().toDate();
        syncInfo.nextTime = moment(syncInfo.nextTime).utcOffset(8).format();
        syncInfo.times++ //次数+1
        logger.info(`开始执行MC服务端同步(times：${syncInfo.times})`);
        //开始执行同步
        //检查servers文件夹存在？
        if (!fs.existsSync(path + '/servers')) {
            fs.mkdirSync(path + '/servers', {recursive: true});
        }
        //temp文件夹
        if (!fs.existsSync(path + '/temp')) {
            fs.mkdirSync(path + '/temp', {recursive: true});
        }

        //开始同步
        //await jsonBDS(path);
        cleanLogs()
        await syncTravertine(path);
        await outputJsonOfMirror('travertine', path)
        await syncSpongeVanilla(path);
        await outputJsonOfMirror('spongevanilla', path);
        await syncSpongeForge(path);
        await outputJsonOfMirror('spongeforge', path);
        await syncPufferfish(path); //海豚端 包含了4个不同的东东
        await jsonSpigot(path, config.banSpigot);
        await syncLocalJson(path, "spigot")
        await syncMohist(path);
        await syncCatserver(path); //其实只同步url
        await syncLocalJson(path, "catserver")
        await syncArclight(path); //其实只同步url
        await syncLocalJson(path, "arclight")
        await syncLeaves(path);
        await outputJsonOfMirror('leaves', path);
        await jsonNeoForge(path);
        await jsonVanilla(path, config.banVanilla);
        await jsonForge(path, config.banForge);
        await jsonBukkit(path, config.banBukkit);
        await syncPurpur(path);
        await outputJsonOfMirror('purpur', path);
        await syncLightfall(path);
        await syncFolia(path);
        await outputJsonOfMirror('folia', path)
        await syncVelocity(path);
        await outputJsonOfMirror('velocity', path)
        await jsonFabric(path);
        await outputJsonOfMirror('mohist', path)
        await syncPaper(path);
        await outputJsonOfMirror('paper', path);
        deleteFilesNow();//删除文件
        //resources文件夹
        if (!fs.existsSync(path + '/resources')) {
            fs.mkdirSync(path + '/resources', {recursive: true});
        }
        //合并json
        await combineJson(path)
        logger.info(`执行MC服务端同步结束(times：${syncInfo.times})`);
        await checkUpdate();
        syncInfo.working = false;
    } else {
        logger.warn(`已经有正在执行的MC服务端同步任务`);
    }

}

module.exports = {syncTask, syncInfo};
