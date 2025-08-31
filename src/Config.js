//导入dotenv库
require("dotenv").config();

const config = {
    //仓库链接
    repositoryURL: "https://github.com/3169651074/RendererGUI",

    //是否最大化窗口
    isMaximize: false,

    //窗口初始大小
    windowWidth: 1600,
    windowHeight: 900,

    //渲染器可执行文件路径
    executablePath: "E:\\Code\\C++Test\\bin\\C++Test.exe",

    //API地址
    apiAddress: "https://api.deepseek.com/v1/chat/completions",
    //从.env导入API Key
    apiKey: process.env.API_KEY,
    //模型ID
    modelID: "deepseek-chat",

    //网络代理
    proxy: null,

    //是否启用代理
    isUseProxy: false
};

//导出configs对象中的属性
module.exports = config;