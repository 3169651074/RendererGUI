// ====== 导入库 ======

//const configs = require("./Config.js");
const McpServer = require("@modelcontextprotocol/sdk/server/mcp.js").McpServer;
const StdioServerTransport = require("@modelcontextprotocol/sdk/server/stdio.js").StdioServerTransport;
const zod = require("zod").z;

// ====== 全局变量 ======

let server = null;

// ====== 服务器主逻辑函数 ======

//工具执行函数
function sendCommand(command) {
    console.error("Sending command", command, "from MCP");
}

function configure(id, value) {
    console.error("Setting element id =", id, "to ", value);
}

function getElementIDs() {
    console.error("Get the id of all input elements.");
}

async function main() {
    console.error("Initializing MCP server...");

    server = new McpServer({
        name: "server",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {},
        },
    });

    //注册服务器工具
    server.tool("SendCommand", "Sending command to the renderer", sendCommand);
    server.tool("Configure", "Configure current settings using element id and new value for the element.",
        {id: zod.string().describe("ID of the element"), value: zod.string().describe("New value of the element")},
        (id, value) => {configure(id, value);
    });
    server.tool("GetID", "Get the id of all available elements.", getElementIDs);

    //启动服务器
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("Server connected.");
}

main().then(() => {
    console.error("MCP Server is running on stdio.");
});