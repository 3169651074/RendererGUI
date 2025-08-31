// ====== 导入配置和库 ======

//const configs = require("./Config.js");
const McpClient = require("@modelcontextprotocol/sdk/client/index.js").Client;
const StdioClientTransport = require("@modelcontextprotocol/sdk/client/stdio.js").StdioClientTransport;
const readline = require("readline");
const path = require("path");

// ====== 全局变量 ======

let client = null;
const serverScriptPath = "./MCPServer.js";

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
        const tools = toolsResult.tools.map((tool) => {
            return {
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema,
            };
        });
        console.log("Tools:", tools.map(({ name }) => name));
    } catch (e) {
        //client允许使用log
        console.log("Failed to connect to MCP server: ", e);
    }
}

async function chatLoop() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    function askQuestion(query) {
        return new Promise(resolve => rl.question(query, resolve));
    }

    while (true) {
        const toolName = await askQuestion("Enter tool to call (or 'quit' to exit): ");
        if (toolName.toLowerCase() === "quit") {
            break;
        }

        try {
            const toolsResult = await client.listTools();
            const tool = toolsResult.tools.find(t => t.name === toolName);

            if (tool == null) {
                console.log(`Tool "${toolName}" not found.`);
                continue;
            }

            let input = {};
            if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
                const inputString = await askQuestion(`Enter JSON input for ${toolName}: `);
                input = JSON.parse(inputString);
            }

            const result = await client.callTool(toolName, input);
            console.log(`Tool ${toolName} returned:`, result);
        } catch (error) {
            console.error(`Error calling tool ${toolName}:`, error);
        }
    }
    rl.close();
}

async function cleanUp() {
    await client.close();
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