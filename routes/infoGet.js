const fs = require('fs');
const {getResponse} = require("../utils/http");


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

//获取MSLFRP的订单接口地址
function getOrderAddrMSLFrp(path) {
    return function (req, res) {
        try {
            fs.readFile(path, (err, data) => {
                if (err) {
                    res.status(500).send('服务器内部错误');
                    return;
                }
                res.send(JSON.parse(data).MSLFrp.orderapi);
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
    getFrp,
    getLatestVersion,
    getNoticeMain,
    getNoticeTIPS,
    getCFToken,
    getUpdateLog,
    getNoticeID,
    getOrderAddrMSLFrp,
    getNoticeMSLFrp,
    getZuluVersions,
};
