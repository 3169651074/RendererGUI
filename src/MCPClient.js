// ====== 导入配置和库 ======

//const configs = require("./Config.js");
const McpClient = require("@modelcontextprotocol/sdk/client/index.js").Client;
const StdioClientTransport = require("@modelcontextprotocol/sdk/client/stdio.js").StdioClientTransport;
const readline = require("readline");
const path = require("path");
const chatService = require("./ChatService.js");

// ====== 全局变量 ======

let client = null;
const serverScriptPath = "./MCPServer.js";
let tools = null;

// ====== 客户端主逻辑函数 ======

async function connectToServer() {
    //连接到服务器
    try {
        //启动服务器进程
        const transport = new StdioClientTransport({
            command: "node",
            args: [path.join(__dirname, serverScriptPath)]
        });
        await client.connect(transport);

        //获取工具列表
        const toolsResult = await client.listTools();
        tools = toolsResult.tools.map((tool) => {
            return {
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
            };
        });
        console.log("Tools:", tools.map(({ name }) => name));
    } catch (e) {
        //client允许使用log
        console.log("Failed to connect to MCP server: ", e);
    }
}

async function cleanUp() {
    await client.close();
}

//对话循环，阻塞客户端线程直到退出时释放资源
async function chatLoop() {
    //创建接口，监听stdin
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false, //禁用终端模式
    });

    console.log("Client ready to receive input...");

    //异步循环处理每一行输入，循环会在父进程调用stdin.end()时退出
    //传递调用结果：向stdout中打印以[OK]或[Error]开头的字符串，后面接大模型的回复消息或错误信息
    for await (const line of rl) {

    }

    console.log("stdin.end() called, quitting chat loop...");
}

async function main() {
    client = new McpClient({
        name: "client", version: "1.0.0"
    });

    //连接到服务器
    await connectToServer();

    //启动对话循环
    await chatLoop();

    //执行到这里说明对话已经结束，清理资源
    await cleanUp();
}

main().then(() => {
   console.log("Client started.");
});