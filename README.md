# 智慧校园一站式服务小程序

面向校园场景的一站式微信小程序，包含新闻资讯、校园交流、消息通知、个人中心、学习工具、智能问答入口和后台管理服务。

## 功能模块

- 首页：校园服务入口、学习工具、问答入口。
- 新闻资讯：新闻列表、分类筛选、详情查看、浏览与点赞。
- 校园交流：帖子发布、详情查看、点赞、收藏、浏览记录。
- 消息通知：系统消息与校园通知展示。
- 个人中心：个人资料、本地收藏、历史记录、草稿箱、活动与反馈。
- 后台服务：Node.js 接口、MySQL 数据存储、管理后台页面。

## 项目结构

- `pages/`：小程序页面
- `components/`：公共组件
- `utils/`：前端工具方法
- `backend/`：Node.js 接口服务与管理后台
- `images/`：小程序图片资源
- `scripts/`：项目辅助脚本

## 下载项目

可以直接在 GitHub 页面点击 `Code` 下载 ZIP，也可以使用命令下载：

```bash
git clone https://github.com/Davin-06/campus-service-mini-program.git
cd campus-service-mini-program
```

## 环境要求

- 微信开发者工具
- Node.js 18 或以上版本
- MySQL 5.7 或 8.x
- 已申请的微信小程序 AppID
- 正式发布时需要已备案并配置 HTTPS 的服务域名

## 后端配置

进入后端目录并安装依赖：

```bash
cd backend
npm install
```

复制环境变量示例文件：

```bash
copy .env.example .env
```

在 `backend/.env` 中填写本地或服务器配置：

```env
PORT=3000
CORS_ORIGIN=*

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的数据库密码
DB_NAME=news_db

ASSISTANT_API_KEY=
ASSISTANT_API_URL=
ASSISTANT_MODEL=
```

`ASSISTANT_API_KEY`、`ASSISTANT_API_URL`、`ASSISTANT_MODEL` 只在需要启用智能问答服务时填写，并且只能保存在服务端 `.env` 文件中，不能写进小程序前端代码。

## 数据库初始化

登录 MySQL 后执行初始化脚本：

```bash
mysql -u root -p < init.sql
```

如果需要补充测试数据，可以在后端目录中按需执行：

```bash
node init-test-data.js
node init_news.js
```

## 启动服务

在 `backend` 目录启动接口服务：

```bash
npm start
```

默认接口地址为：

```text
http://127.0.0.1:3000/api
```

后台管理页面位于：

```text
backend/admin/index.html
```

## 小程序运行

1. 打开微信开发者工具。
2. 选择“导入项目”，目录选择项目根目录。
3. 将 `project.config.json` 中的 `appid` 替换为自己的微信小程序 AppID。
4. 根据后端地址修改 `app.js` 中的 `apiBaseUrl`。
5. 本地调试可以使用 `http://127.0.0.1:3000/api`。
6. 正式上线前必须改为已在微信公众平台配置的 HTTPS 合法域名。

## 发布前检查

- 确认 `backend/.env` 没有提交到仓库。
- 确认数据库账号、密码、服务端密钥只配置在服务器环境变量中。
- 确认 `app.js` 中的 `apiBaseUrl` 是正式 HTTPS 域名。
- 确认微信公众平台已配置 request 合法域名。
- 确认 `project.config.json` 使用自己的小程序 AppID。
- 确认后端服务器、防火墙、数据库权限和跨域配置正常。

## 常用命令

```bash
# 安装后端依赖
cd backend
npm install

# 启动后端
npm start

# 开发模式启动后端
npm run dev
```

## 安全说明

仓库中只保留 `.env.example` 示例文件，不包含真实接口密钥、数据库密码和本地开发者私有配置。提交代码前请继续保持以下文件不进入版本库：

- `backend/.env`
- `backend/node_modules/`
- `project.private.config.json`
- 日志文件和系统缓存文件
