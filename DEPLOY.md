# 部署到 Render 指南

## 前提条件
- GitHub 账号
- Render 账号（https://render.com）
- MongoDB Atlas 连接字符串已准备好

## 部署步骤

### 1. 准备代码仓库（GitHub）

```bash
# 初始化 Git 仓库（如果还没有）
git init
git add .
git commit -m "初始提交"

# 创建 GitHub 仓库，然后推送代码
git remote add origin https://github.com/YOUR_USERNAME/cat-care-service.git
git branch -M main
git push -u origin main
```

### 2. 在 Render 上部署

#### 方法 A：使用 render.yaml（推荐）
1. 访问 https://render.com
2. 登录或注册账号
3. 点击 "New +" → "Web Service"
4. 连接你的 GitHub 仓库
5. Render 会自动读取 `render.yaml` 配置
6. 配置完成后自动部署

#### 方法 B：手动配置
1. 访问 https://render.com
2. 登录或注册账号
3. 点击 "New +" → "Web Service"
4. 连接你的 GitHub 仓库 `cat-care-service`
5. 填写以下信息：
   - **Name**: cat-care-service（或自定义）
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free（免费）

### 3. 设置环境变量

在 Render Dashboard 中：
1. 进入你的服务详情页
2. 左侧菜单 → "Environment"
3. 添加环境变量：
   - **Key**: `MONGO_URI`
   - **Value**: `mongodb+srv://kakeiniu_DB:Hyron11%23@cluster0.ygeo1ay.mongodb.net/catcare`

### 4. 部署完成

- 等待部署完成（通常 2-3 分钟）
- Render 会自动生成一个公网 URL，如：`https://cat-care-service.onrender.com`
- 访问该 URL 测试应用

## 更新代码

后续更新只需 push 到 GitHub，Render 会自动重新部署：

```bash
git add .
git commit -m "更新信息"
git push origin main
```

## 注意事项

⚠️ **安全建议**：
- 不要在代码中硬编码 MongoDB URI 密码
- `.env` 文件已添加到 `.gitignore`，不会被上传
- 在 Render 的"Environment"中设置敏感信息

⚠️ **免费套餐限制**：
- 15 分钟无流量会自动休眠
- 冷启动时间约 30 秒
- 需要付费套餐才能保持 24/7 运行

## 调试

查看服务日志：
1. Render Dashboard → 选择你的服务
2. 右上角 "Logs" 标签
3. 查看实时日志

## 绑定自定义域名（可选）

1. Render Dashboard → 你的服务 → "Settings"
2. 找到 "Custom Domain"
3. 输入你的域名，按提示修改 DNS 设置
