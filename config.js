//配置文件
const config = {
    //基本配置
    port: 3000, //api的运行端口
    taskCron: '0 */6 * * *', //执行同步的周期（cron表达式）,
    path: '',//配置工作路径,留空则采用当前位置
    serverUrl: 'https://yourapi.com/files/',//镜像文件的请求地址 一般是api运行的地址+/files
    NODE_TLS_REJECT_UNAUTHORIZED: true,//设定为true时，关闭ssl证书验证
    apiToken: 'token',//执行部分api路由的时候用的token 如：手动档用法: /run?ts=Unix时间戳&sign=ts+token的md5
    githubPackageUrl: 'https://github.moeyy.xyz/https://raw.githubusercontent.com/MSLTeam/MSL-API-V2/master/package.json',//github上package地址，用于检查更新
    //配置部分服务端的屏蔽更新（这些端的低版本官方基本不会更新，若需要屏蔽，请把低于设定数值的版本放在 /res/archive_json/{服务端名字}.json中，程序会自动合并）
    //请填写低于哪些版本不更新（不包括填写的版本），如果想要全部更新，请填写0.0.0
    banBukkit: '1.16.5',
    banSpigot: '1.16.5',
    banForge: '1.12.2',
    banVanilla: '1.20.3',
    //下载镜像的配置，下载镜像的服务端：github.com/MSLTeam/download-server
    useMirrorDownload: false,
    MIRROR_AUTH_TOKEN: '',
    mirrorUrl: '',
};

module.exports = config;