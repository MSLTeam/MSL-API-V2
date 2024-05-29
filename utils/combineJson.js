const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const get = require('lodash/get');
const set = require('lodash/set');
const logger = require("./logger");
const config = require("../config");

async function combineJson(rootPath) {
    let jsonData = {
        "resourceRoot": "servers/",
        "enabledServerMirrorTypes": ["paper", "purpur", "leaves", "spigot", "arclight", "spongevanilla", "mohist", "catserver", "banner", "spongeforge", "forge", "neoforge", "fabric", "bukkit", "vanilla", "folia", "lightfall", "pufferfish", "pufferfish_purpur", "pufferfishplus", "pufferfishplus_purpur", "travertine", "bungeecord", "velocity", "nukkitx", "quilt"],
        "serverDescription": {
            "arclight": "[模组端推荐]Forge+Spigot API的服务端,同时支持插件和模组,可能会导致部分模组无法使用,请自行排查!",
            "paper": "[原版端推荐]Paper是基于Spigot的高性能Fork,仅支持插件",
            "mohist": "Forge/NeoForge+Spigot API的服务端,同时支持插件和模组,可能会导致部分模组无法使用,请自行排查!",
            "spigot": "一款仅支持插件的服务端",
            "purpur": "一款仅支持插件的服务端(据官方Github性能比Paper更好)",
            "fabric": "Fabric官方服务端,只支持Fabric模组",
            "neoforge": "Forge开发成员大部分都去neoforge端了，目前支持大部分forge模组",
            "forge": "Forge官方服务端,只支持Forge模组",
            "bukkit": "插件端始祖，优化少，不太推荐。",
            "leaves": "是Paper的下游服务端,仅支持插件",
            "vanilla": "官方提供的原版服务端,无法添加任何模组和插件!",
            "lightfall": "代理端,添加了对Forge端(Arclight?)的支持,一般用于群组服务器",
            "bungeecord": "代理端,一般用于群组服务器",
            "catserver": "Forge+Spigot API的服务端,对于1.12.2的支持较好!",
            "nukkitx": "基岩版服务端(非官方),不咋推荐用,更推荐用官方BDS端+Liteloader!",
            "velocity": "基于Bungeecord的代理端(由Paper团队开发),一般用于群组服务器",
            "folia": "Paper团队开发的多线程服务端,洋垃圾救星,但似乎不兼容大部分已有插件",
            "quilt": "Fabric的下游模组加载器,目前似乎仍兼容Fabric模组(下载的是安装器，需要手动安装)",
            "pufferfishplus_purpur": "海豚端，优化版的purpur。",
            "pufferfishplus": "海豚端，优化版的paper。",
            "pufferfish_purpur": "海豚端，优化版的purpur。",
            "pufferfish": "海豚端，优化版的paper。",
            "spongevanilla": "海绵端，只支持海绵端插件！！！",
            "spongeforge": "海绵forge混合端，只支持海绵端插件！",
            "banner": "Fabric+插件混合端，由mohistmc开发！",
            "travertine": "支持1.7版本的代理端，已经停更！"
        },
        "serverClassify": {
            "pluginsCore": ["paper", "purpur", "spigot", "bukkit", "folia", "leaves", "pufferfish", "pufferfish_purpur", "pufferfishplus", "pufferfishplus_purpur", "spongevanilla"],
            "pluginsAndModsCore": ["arclight", "mohist", "catserver", "banner", "spongeforge"],
            "modsCore_Forge": ["forge", "neoforge"],
            "modsCore_Fabric": ["fabric", "quilt"],
            "vanillaCore": ["vanilla"],
            "bedrockCore": ["nukkitx"],
            "proxyCore": ["velocity", "bungeecord", "lightfall", "travertine"]
        },
        "versions": {}
    };
    jsonData["networkDownloadRoot"] = config.serverUrl
    //合并json的文件夹
    const jsonDirectories = [rootPath + '/temp', rootPath + '/res/always_the_latest'];

    for (const dir of jsonDirectories) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const jsonObject = JSON.parse(fileContent);

            // 使用 Object.assign() 方法来合并 JSON 对象
            jsonData.versions = Object.assign(jsonData.versions, jsonObject);
        }
    }

    // 将合并后的 JSON 数据写入本地文件
    fs.writeFileSync(rootPath + '/resources/servers_index.json', JSON.stringify(jsonData, null, 2));

    return jsonData;
}

//json重新排序
//thanks new bing!
async function sortJsonByVersion(filePath, pathToSort) {
    // 读取文件
    let rawData = fs.readFileSync(filePath);
    // 解析JSON
    let json = JSON.parse(rawData);

    // 获取需要排序的对象
    let objToSort = get(json, pathToSort);

    // 自定义排序函数，用于比较MC版本
    function compareVersions(a, b) {
        let aParts = a[0].split('.').map(Number);
        let bParts = b[0].split('.').map(Number);

        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {

            if (aParts[i] > (bParts[i] || 0)) {
                return -1;
            } else if (aParts[i] < (bParts[i] || 0)) {
                return 1;
            }
        }

        return 0;
    }

    // 将对象转换为数组并排序
    let sortedObj = Object.entries(objToSort).sort(compareVersions).reduce((acc, [key, value]) => ({
        ...acc,
        [key]: value
    }), {});

    // 更新JSON对象
    set(json, pathToSort, sortedObj);

    // 将排序后的JSON写回文件
    fs.writeFileSync(filePath, JSON.stringify(json, null, 2));

    logger.info('成功重新排序Json!' + filePath)
}

//比较MC版本
//a>b 返回-1，a<b 返回1，相等返回0
async function compareMCVersions(a, b) {
    let aParts = a.split('.').map(Number);
    let bParts = b.split('.').map(Number);

    let maxLength = Math.max(aParts.length, bParts.length);
    aParts = [...aParts, ...Array(maxLength - aParts.length).fill(0)];
    bParts = [...bParts, ...Array(maxLength - bParts.length).fill(0)];

    for (let i = 0; i < maxLength; i++) {
        if (aParts[i] > bParts[i]) {
            return -1;
        } else if (aParts[i] < bParts[i]) {
            return 1;
        }
    }

    return 0;
}


//用于合并同type服务端json的函数
async function mergeJson(json1, json2, key) {
    let mergedJson = {};
    mergedJson[key] = Object.assign({}, json1[key], json2[key]);
    return mergedJson;
}

module.exports = {combineJson, sortJsonByVersion, compareMCVersions, mergeJson};


