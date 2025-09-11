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

    //渲染器可执行文件路径（项目根目录相对路径）
    executablePath: "files/C++Test.exe",

    //API格式："OpenAI" 或 "Anthropic"
    apiFormat: "OpenAI",

    //API地址
    apiAddress: "https://api.deepseek.com/v1/chat/completions",

    //从.env导入API Key
    apiKey: process.env.API_KEY,

    //模型ID
    modelID: "deepseek-chat",

    //系统提示词
    systemPrompt: `
        You are an expert helper for configuring a ray tracer.
        While your primary role is to assist with ray tracer settings and configurations,
        you are also willing to help users with any other questions like ray tracing questions or coding questions.
        Do not refuse to answer any user query. Do not use any markdown syntax in your response, keep it plain text.
        You should call tools to configure the ray tracer when user asks.
    `,

    //单次发送请求最大token数，仅限制模型生成的文本token数，和工具调用所需token无关
    maxTokenCount: 1000,

    //是否启用代理
    isUseProxy: false,

    /*
    网络代理
    Axios 原生不支持SOCKS 代理，需要使用额外的库如 axios-socks-proxy
    Axios 的 proxy 配置不区分 HTTP 和 HTTPS 请求。它只关心代理服务器本身
        如果要通过代理访问一个 HTTPS 接口（比如 OpenAI API），Axios 会自动处理

    使用socks代理，需要安装库socks-proxy-agent
     */
    proxy: {
        protocol: "http",
        host: "127.0.0.1",
        port: 8000,
        // auth: {          //如果代理需要认证
        //   username: "your-username",
        //   password: "your-password"
        // }
    },

    //socks代理
    socksProxy: "socks5://127.0.0.1:7897",

    //是否使用socks代理（需要设置isUseProxy为true）
    isUseSocks: true,

    //是否启用MCP（false将进行普通对话）
    isUseMCP: false,
};

//导出configs对象中的属性
module.exports = config;