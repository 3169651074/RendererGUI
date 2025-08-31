// ====== 辅助函数和逻辑函数 ======

//将 0-255 的整数转换为两位十六进制字符串
function toHex(number) {
    /*
     * parseInt(c, 10)：将输入变量 c 按十进制转换为整数
     * .toString(16)：把上一步得到的整数转换成十六进制字符串
     * "0" + ... .substring()：前面加0补位，并取字符串的最后两位，保证结果总是两位
     */
    let result = "0" + parseInt(number, 10).toString(16);
    result = result.substring(result.length - 2, result.length);
    return result;
}

//根据背景亮度更新标题颜色
function updateTitleColor(titleElement, r, g, b) {
    //使用YIQ公式计算颜色的感知亮度
    const luminance = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    //如果亮度大于阈值（128是中间点），则为黑色标题
    if (luminance > 220) {
        titleElement.color = "#000000"; //黑色
        titleElement.textShadow = "1px 1px 2px rgba(255,255,255,0.2)";
    } else {
        titleElement.color = "#FFFFFF"; //白色
        titleElement.textShadow = "1px 1px 2px rgba(0,0,0,0.2)";
    }
}

//监听RGB输入框的变化，更新颜色选择器和页面背景
function updateColorPickerAndBackground(titleElement, backgroundElement, colorPickerElement, colorRInput, colorGInput, colorBInput) {
    //当colorRInput.value为空时，使用"0"
    const r = parseInt(colorRInput.value || "0", 10);
    const g = parseInt(colorGInput.value || "0", 10);
    const b = parseInt(colorBInput.value || "0", 10);

    //将RGB值转换为 #RRGGBB 格式的十六进制颜色
    const hexColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

    //更新颜色选择器颜色
    colorPickerElement.value = hexColor;
    //更新背景颜色
    backgroundElement.backgroundColor = hexColor;
    //更新标题颜色
    updateTitleColor(titleElement, r, g, b);
}

//生成命令
function generateCommand(outputTextarea, resolutionXInput, resolutionYInput,
                         colorRInput, colorGInput, colorBInput,
                         samplesPerPixelInput, maxDepthInput, cameraUpInput)
{
    //分辨率
    const resX = resolutionXInput.value;
    const resY = resolutionYInput.value;

    //背景颜色 (获取 0-255 值)
    const bgColorR_255 = parseFloat(colorRInput.value);
    const bgColorG_255 = parseFloat(colorGInput.value);
    const bgColorB_255 = parseFloat(colorBInput.value);

    //转换背景颜色到 0-1 范围
    const bgColorR_norm = (bgColorR_255 / 255.0).toFixed(3);
    const bgColorG_norm = (bgColorG_255 / 255.0).toFixed(3);
    const bgColorB_norm = (bgColorB_255 / 255.0).toFixed(3);

    //其他参数
    const fov = fovInput.value;
    const samplesPerPixel = samplesPerPixelInput.value;
    const maxDepth = maxDepthInput.value;
    const cameraUp = cameraUpInput.value;

    //构建命令字符串数组
    const commands = [];
    commands.push(`set resolution {${resX} ${resY}}`);
    commands.push(`set background_color {${bgColorR_norm} ${bgColorG_norm} ${bgColorB_norm}}`);
    commands.push(`set fov ${fov}`);
    commands.push(`set samples_per_pixel ${samplesPerPixel}`);
    commands.push(`set max_depth ${maxDepth}`);

    let cameraUpValue = "{0 1 0}"; // 默认Y轴向上
    if (cameraUp === "x") {
        cameraUpValue = "{1 0 0}";
    } else if (cameraUp === "z") {
        cameraUpValue = "{0 0 1}";
    }
    commands.push(`set camera_up ${cameraUpValue}`);

    //将命令数组用 " && " 连接成一个字符串，并显示在文本框中
    outputTextarea.value = commands.join(" && ");

    //如果之前已经有命令，则触发高亮动画：移除类后重新添加
    if (outputTextarea.value !== "") {
        outputTextarea.classList.remove("highlight-flash"); // 重置动画
        void outputTextarea.offsetWidth;
        outputTextarea.classList.add("highlight-flash");
    }
}

// ====== 聊天功能函数 ======

//添加消息到聊天区域
function addMessageToChat(content, sender = "user", isLoading = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${sender}`;

    if (isLoading) {
        messageDiv.innerHTML = `
            <div class="loading-message">
                <span>AI is thinking</span>
                <div class="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messageDiv.id = "loading-message";
    } else {
        const currentTime = new Date().toLocaleTimeString();

        messageDiv.innerHTML = `
            <div class="message-sender">${sender === "user" ? "You" : "AI"}</div>
            <div class="message-bubble">${content}</div>
            <div class="message-time">${currentTime}</div>
        `;
    }
    chatMessagesContainer.appendChild(messageDiv);

    //自动滚动到底部
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
    return messageDiv;
}

//移除加载消息
function removeLoadingMessage() {
    const loadingMessage = document.getElementById("loading-message");
    if (loadingMessage) {
        loadingMessage.remove();
    }
}

//清空聊天区域
function clearChat() {
    chatMessagesContainer.innerHTML = "";
}

//发送消息到AI
async function sendMessageToAI(message) {
    //添加用户消息
    addMessageToChat(message, "user");

    //显示加载状态
    addMessageToChat("", "ai", true);

    try {
        //调用主进程的聊天功能
        const response = await mainProcess.sendMessageToChat(message);

        //移除加载状态
        removeLoadingMessage();

        //添加AI回复
        if (response && response.trim()) {
            addMessageToChat(response, "ai");
        } else {
            addMessageToChat("Sorry, an error encountered while processing message.", "ai");
        }
    } catch (error) {
        //移除加载状态
        removeLoadingMessage();

        //显示错误消息
        addMessageToChat("Failed to get response from AI. Please check your connection.", "ai");
        console.error("Chat error:", error);
    }
}