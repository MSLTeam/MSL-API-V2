const fs = require('fs');
const {getResponse} = require("./http");
const logger = require("./logger");
const sqlite3 = require('sqlite3').verbose();
const url = require('url');

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
    const today = new Date().toISOString().slice(0, 10);
    db.all(`SELECT url, COUNT(*) as count FROM log WHERE date(response_time) = ? AND status != 404 GROUP BY url`, [today], (err, rows) => {
        if (err) {
            console.error(err.message);
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

            // 获取今天有多少不同的 IP
            db.all(`SELECT COUNT(DISTINCT ip) as ipCount FROM log WHERE date(response_time) = ?`, [today], (err, ipRows) => {
                if (err) {
                    console.error(err.message);
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


//从versions中返回服务端类型
function availableServerTypes(path) {

    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);

                res.send(json.enabledServerMirrorTypes);

            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//分类
function serverClassify(path) {

    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);

                res.send(json.serverClassify);

            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//返回服务端描述
function getServerDescription(path) {
    return function (req, res) {
        try {
            let server = req.params.server;

            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);
                let serverDescription = json.serverDescription[server];

                if (serverDescription) {
                    res.send(serverDescription);
                } else {
                    res.status(404).send('未找到服务器描述');
                }
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//返回该服务端可用版本
function getAvailableVersions(path) {
    return function (req, res) {
        try {
            let server = req.params.server;

            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);
                let versions = json.versions[server];

                if (versions) {
                    let versionKeys = Object.keys(versions);
                    res.send(versionKeys);
                } else {
                    res.status(404).send('未找到服务器版本');
                }
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//返回下载url，并在头部返回sha256校验（如果支持）
function downloadServer(path) {
    return function (req, res) {
        try {
            let server = req.params.server;
            let version = req.params.version;

            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);
                let serverVersion = json.versions[server][version];

                if (serverVersion) {
                    let fileUrl = serverVersion.file;
                    if (serverVersion.mode === 'relative') {
                        fileUrl = json.networkDownloadRoot + serverVersion.file;
                        res.setHeader('sha256', serverVersion.sha256);
                    }
                    res.send(fileUrl);
                } else {
                    res.status(404).send('未找到服务器版本');
                }
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//获取frp json
function getFrp(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                const jsonData = JSON.parse(data);
                res.send(jsonData);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }
    };
}


//获取最新版本
function getLatestVersion(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).latestVersion);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

function getNoticeID(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).noticeID.toString());
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }
    };
}


function getUpdateLog(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).updateLog);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//下载最新版本
function downloadLatestVersion(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).downloadUrl);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//下载FRP，只支持win
function downloadFrp(path) {
    return function (req, res) {
        try {
            let source = req.params.source;
            let platform = req.params.platform

            if (source === 'OpenFrp') {
                //从OF获取frp
                try {
                    getResponse('https://console.openfrp.net/web/commonQuery/get?key=software')
                        .then(response => {
                            if (response.data) {
                                const jsonOF = JSON.parse(response.data).data;
                                jsonOF.soft.forEach(function (obj) {
                                    if (obj.os === 'windows') {
                                        let platformExists = obj.arch.some(arch => arch.label === platform);
                                        if (platformExists) {
                                            obj.arch.forEach(function (arch) {
                                                if (arch.label === platform) {
                                                    res.send(`https://o.of.gs/client/${jsonOF.latest_full}/${arch.file}`);
                                                    return;
                                                }
                                            });
                                        } else {
                                            res.status(404).send('平台不存在');
                                            return;
                                        }
                                    }
                                });
                            }
                        })
                        .catch(err => {
                            res.status(500).send('服务器内部错误' + err);
                        });
                } catch (err) {
                    res.status(500).send('服务器内部错误' + err);
                    return;
                }

            } else if (source === 'MSLFrp') {
                fs.readFile(path, (err, data) => {
                    if (err) {
                        res.status(500).send('服务器内部错误');
                        return;
                    }

                    let json = JSON.parse(data);
                    if (json.MSLFrp.frpc[platform]) {
                        res.send(json.MSLFrp.frpc[platform].file);
                    } else {
                        res.status(404).send('平台不存在');
                    }
                });

            } else {
                res.status(500).send('找不到该平台的Frpc！');
                return;
            }


        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//下载最新版本
function getNoticeMain(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).notice);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

function getNoticeTIPS(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).tips);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

function getNoticeMSLFrp(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).MSLFrp.notice.content);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//java版本
function getZuluVersions(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }

                let json = JSON.parse(data);
                let versions = json["Java"];

                if (versions) {
                    let versionKeys = Object.keys(versions);
                    res.send(versionKeys);
                } else {
                    res.status(404).send('未找到Java版本');
                }
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

//下载java
function downloadJava(path) {
    return function (req, res) {
        let ver = req.params.ver
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data)["Java"][ver].url);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }

    };
}

function getCFToken(path) {
    return function (req, res) {

        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                let jsonData = JSON.parse(data);
                let tokenBase64 = Buffer.from(jsonData.token).toString('base64');
                res.send(tokenBase64);
            });
        } catch (err) {
            res.status(500).send('服务器内部错误');
        }
    };
}


module.exports = {
    availableServerTypes,
    getServerDescription,
    getAvailableVersions,
    downloadServer,
    getFrp,
    getLatestVersion,
    downloadLatestVersion,
    downloadFrp,
    getNoticeMain,
    getNoticeTIPS,
    getCFToken,
    getUpdateLog,
    getNoticeID,
    getNoticeMSLFrp,
    getZuluVersions,
    downloadJava,
    openDb,
    getStatCount,
    serverClassify
};
