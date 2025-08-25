/*
 * mcp进程和主进程是两个独立的nodejs进程，不能直接使用渲染进程和主进程的通信方式
 * 需要使用nodejs内置的ipc通信模块
 */

const _error = console.error;
console.error = function (...args) {
    const now = new Date();
    const MM = String(now.getMonth() + 1).padStart(2, "0"); // 月份
    const DD = String(now.getDate()).padStart(2, "0");      // 日
    const HH = String(now.getHours()).padStart(2, "0");     // 时
    const mm = String(now.getMinutes()).padStart(2, "0");   // 分
    const ss = String(now.getSeconds()).padStart(2, "0");   // 秒
    _error(`[${MM}-${DD}->${HH}:${mm}:${ss}] [MCP Server]`, ...args);
};

//导入mcp模块
const McpServer = require("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
const StdioServerTransport = require("@modelcontextprotocol/sdk/server/stdio.js").StdioServerTransport;
const zod = require("zod").z;

//MCP服务器进程如果使用stdio，则不能向stdout中写入任何信息，否则会破坏JSON-RPC信息传递
console.error("Initializing MCP server...");

//创建MCP服务器对象
const server = new McpServer({
    name: "server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

//注册服务器工具
server.tool("StartRenderer", "Start renderer",
    async () => {
        console.error("Start renderer form MCP");
        if (process.send != null) {
            process.send({type: "StartRenderer", payload: null});
            console.error(`Sent command start renderer to main process via IPC.`);
        } else {
            console.error("IPC channel not available. Cannot send command to main process.");
        }
    }
);

server.tool("StopRenderer", "Stop renderer",
    async () => {
        console.error("Stop renderer form MCP");
        if (process.send != null) {
            process.send({type: "StopRenderer", payload: null});
            console.error(`Sent command stop renderer to main process via IPC.`);
        } else {
            console.error("IPC channel not available. Cannot send command to main process.");
        }
    }
);

server.tool("SendCommand", "Sending command to renderer",
    {command: zod.string().describe("Command sending to renderer")},
    async ({command}) => {
        console.error("Sending command", command, "form MCP");

        //检查IPC通道是否存在，并通过它将命令发送给父进程
        if (process.send != null) {
            process.send({type: "SendCommand", payload: command});
            console.error(`Sent command "${command}" to main process via IPC.`);
        } else {
            console.error("IPC channel not available. Cannot send command to main process.");
        }
    }
);

//主函数
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server is running on stdio");
}

//启动服务器，捕获错误
main().catch((error) => {
    console.error("MCP server error:", error);
    process.exit(-1);
});
