const _log = console.log;
console.log = function (...args) {
    const now = new Date();
    const MM = String(now.getMonth() + 1).padStart(2, "0"); // 月份
    const DD = String(now.getDate()).padStart(2, "0");      // 日
    const HH = String(now.getHours()).padStart(2, "0");     // 时
    const mm = String(now.getMinutes()).padStart(2, "0");   // 分
    const ss = String(now.getSeconds()).padStart(2, "0");   // 秒
    _log(`[${MM}-${DD}->${HH}:${mm}:${ss}]`, ...args);
};

//导入mcp模块
const McpClient = require("@modelcontextprotocol/sdk/client/index.js").Client;
const StdioClientTransport = require("@modelcontextprotocol/sdk/client/stdio.js").StdioClientTransport;
const zod = require("zod").z;
const readline = require("readline");

//导入.env文件
require("dotenv").config();

//mcp变量
const serverScriptPath = "./mcp_server.js";

const client = new McpClient({
    name: "client", version: "1.0.0"
});

//连接到mcp服务器
async function connectToServer() {
    try {
        const transport = new StdioClientTransport({
            command: "node",
            args: [serverScriptPath]
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
        console.log("Connected to server with tools:", tools.map(({ name }) => name));

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

//主函数
async function main() {
    await connectToServer();

    //关闭client
    client.close();
}

main();