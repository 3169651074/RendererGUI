//使用MCP Inspector测试服务器：npx @modelcontextprotocol/inspector node src/MCPServer.js
// ====== 导入库 ======

//const configs = require("./Config.js");
const McpServer = require("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
const StdioServerTransport = require("@modelcontextprotocol/sdk/server/stdio.js").StdioServerTransport;
const zod = require("zod").z;

// ====== 全局变量 ======

let server = null;

// ====== 工具执行函数 ======

//server.tool中传入的执行函数为异步函数
async function sendCommand(args) {
    //MCP会将参数打包为一个对象传入
    const { command } = args;
    console.error("[Tool]Sending command", command, "from MCP");

    //工具执行函数的返回值必须打包为对象
    return {
        content: [{ type: "text", text: "Tool call success." }],
    };
}

async function configure(args) {
    const { id, value } = args;
    console.error("[Tool]Setting element id =", id, "to ", value);
    return {
        content: [{ type: "text", text: "Tool call success." }],
    };
}

async function getElementIDs() {
    console.error("[Tool]Get the id of all input elements.");
    return {
        content: [{ type: "text", text: "Tool call success." }],
    };
}

// ====== 主逻辑函数 ======

async function main() {
    console.error("Initializing MCP server...");

    server = new McpServer({
        name: "server",
        version: "1.0.0"
    });

    //注册服务器工具，无需根据模型供应商的消息格式进行特殊处理，MCP的统一格式
    server.tool("SendCommand", //工具名称
        "Sending command to the renderer process",
        {
            //工具参数，.string()表示参数类型
            command: zod.string().describe("The command sent to the renderer process"),
        },
        sendCommand
    );

    server.tool("Configure",
        "Configure current settings using element id and new value for the element",
        {
            id: zod.string().describe("ID of the element"),
            value: zod.string().describe("New value of the element")
        },
        configure
    );

    server.tool("GetID",
        "Get the id of all available elements.",
        //无需参数
        getElementIDs
    );

    //启动服务器
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("Server connected.");
}

main().then(() => {
    console.error("MCP Server is running on stdio.");
}).catch((error) => {
    console.error("Error when starting MCP Server:", error);
});