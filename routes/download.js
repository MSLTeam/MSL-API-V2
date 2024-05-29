const fs = require('fs');
const {getResponse} = require("../utils/http");

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

//下载最新版本
function downloadLatestVersion(path) {
    return function (req, res) {
        try {
            let type = req.query.type;
            if (type === "i18n") {
                fs.readFile(path, (err, data) => {
                    if (err) {
                        res.status(500).send('服务器内部错误');
                        return;
                    }
                    res.send(JSON.parse(data).downloadI18nUrl);
                });
            } else {
                fs.readFile(path, (err, data) => {
                    if (err) {
                        res.status(500).send('服务器内部错误');
                        return;
                    }
                    res.send(JSON.parse(data).downloadNormalUrl);
                });
            }

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

            } else if (source === 'MSLFrp' || source === 'Official') {
                fs.readFile(path, (err, data) => {
                    if (err) {
                        res.status(500).send('服务器内部错误');
                        return;
                    }

                    let json = JSON.parse(data);
                    if (json[source].frpc[platform]) {
                        res.send(json[source].frpc[platform].file);
                    } else {
                        res.status(404).send('平台不存在');
                    }
                });

            } else if (source === 'ChmlFrp') {
                getResponse('https://panel.chmlfrp.cn/api/dw.php')
                    .then(response => {
                        if (response.data) {
                            const jsonChmlFrp = JSON.parse(response.data);
                            if (jsonChmlFrp.system.windows) {
                                let platformExists = jsonChmlFrp.system.windows.some(arch => arch.architecture === platform);
                                if (platformExists) {
                                    jsonChmlFrp.system.windows.forEach(function (arch) {
                                        if (arch.architecture === platform) {
                                            res.send(`${jsonChmlFrp.link}${arch.route}`);
                                            return;
                                        }
                                    });
                                } else {
                                    res.status(404).send('平台不存在');
                                    return;
                                }
                            }
                        }
                    })
                    .catch(err => {
                        res.status(500).send('服务器内部错误' + err);
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

module.exports = {
    downloadLatestVersion,
    downloadFrp, downloadServer, downloadJava,
};