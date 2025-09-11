# RendererGUI
A simple ray tracer config GUI based on Electron

## TODO
已实现的部分：  
&emsp;&emsp;1.构建了应用页面和基本逻辑，正确使用了Electron框架的ipc通信机制  
&emsp;&emsp;2.搭建了MCP客户端和服务器框架，MCP部分仅工具具体实现逻辑没有编写

未实现的部分：  
&emsp;&emsp;1.渲染器子进程可能会在启动后立即报错退出  
&emsp;&emsp;2.isUseMCP为true时，大模型的回复不能正确传递回渲染进程，从而无法显示在页面上，为false时正常  
&emsp;&emsp;3.未实现大模型流式输出回复。无法渲染markdown格式的回复文本（应当通过提示词限制大模型仅回复纯文本）  
&emsp;&emsp;4.页面排版问题，生成命令按钮过大等  
&emsp;&emsp;5.（可选）在页面中提供修改配置的菜单而不是需要打开Config.js和.env进行修改并重启

## MCP
此GUI集成了一个MCP客户端和一个MCP服务器，内置大模型聊天功能，并使用MCP允许大模型访问工具以和渲染器子进程和页面元素。目前支持OpenAI API格式和Anthropic API格式。MCP客户端位于MCPClient.js文件，MCP服务器位于MCPServer.js文件。客户端和服务器部分可以单独运行：将两个MCP文件以及Config.js，.env文件复制出来，使用npm安装依赖库后，运行MCPClient.js即可，客户端会自动启动服务器。启动后，可在终端中向大模型发送提示词，回复也将在终端中展示。此外，也可以在Cherry Studio等第三方MCP客户端中测试MCPServer.js。

## Build
此桌面应用基于Electron，构建前需要安装Node.js，推荐20+版本  
下载仓库文件后，在项目根目录打开终端，关闭网络代理，执行以下命令：  
1. 初始化Node.js项目并安装软件源
```
npm init -y
npm i cnpm
```
重新启动终端确保cnpm被添加到环境。若使用Windows编译，需使用CMD而非PowerShell执行：  
2. 安装Electron
```
cnpm i -D electron@latest
```

3. 安装MCP SDK和辅助库
```
cnpm install @modelcontextprotocol/sdk zod@3 dotenv axios @types/node typescript socks-proxy-agent

**库安装完成后，如果移动了项目文件夹，请删除node_modules文件夹、package.json、package-lock.json并重新执行安装步骤**

## Config
在启动前，需要配置可执行文件路径和大模型环境
* 在项目根目录下创建 .env 文件，使用文本编辑器打开，在文件开头写入以下内容
```
API_KEY=<your api key>
```
将\<your api key>替换为实际的API Key，此 .env 文件已经被添加到了.gitignore中。

* 在Config.js中配置大模型API地址和模型ID。如有需要，可配置网络代理。  
* *请输入完整的API地址，如`https://api.deepseek.com/v1/chat/completions`而不是`https://api.deepseek.com`，可以使用Cherry Studio或官方文档确认*
* *请不要使用带思考的推理模型*

## Run
将package.json中"scripts"属性中的"test"一行替换为`"start": "electron ."`，将"main"修改为`"main": "src/Main.js",`
然后运行命令
```
npm start
```
若使用WebStorm IDE，可打开package.json，点击`"start": "electron ."`一行左侧的绿色箭头即可启动，后续无需打开package.json，直接点击右上角的绿色箭头即启动应用。

## Package
如需打包应用为安装器或可执行文件，可使用常规Electron应用打包工具，如electron-builder等
