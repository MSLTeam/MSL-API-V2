# MC-ServerMirror-AutoSync
用于MSLAPI的同步服务端

暂时不支持直接同步的服务端json文件存储在json文件夹

## 运行方法：（Node版本>18）

```shell
npm i
node index.js
```
访问运行端口获得类似如下的信息
```json5
{
    "status": 200, //状态码，目前只有200
    "lastTime": "2024-02-17T12:00:00+08:00", //上一次执行更新的时间
    "nextTime": "2024-02-17T18:00:00+08:00", //下一次执行更新的时间
    "times": 2, //已经执行了多少次更新
    "cron": "0 */6 * * *" //cron表达式
}
```

## 修改配置

配置项均在config.js 均有注释
