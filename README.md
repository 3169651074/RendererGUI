# RendererGUI
A simple ray tracer config GUI based on Electron

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
cnpm install @modelcontextprotocol/sdk zod@3 dotenv
```

**库安装完成后，如果移动了项目文件夹，请删除node_modules文件夹、package.json、package-lock.json并重新执行安装步骤**

## Config
在启动前，需要配置可执行文件路径和大模型环境
* 在项目根目录下创建 .env 文件，使用文本编辑器打开，在文件开头写入以下内容
```
API_KEY=<your api key>
```
将\<your api key>替换为实际的API Key，此 .env 文件已经被添加到了.gitignore中。

* 在Config.js中配置大模型API地址和模型ID。如有需要，可配置网络代理。

## Run
```
npm start
```
若使用WebStorm IDE，可打开package.json，点击`"start": "electron ."`一行左侧的绿色箭头即可启动，后续无需打开package.json，直接点击右上角的绿色箭头即启动应用。

## Package
如需打包应用为安装器或可执行文件，可使用常规Electron应用打包工具，如electron-builder等
