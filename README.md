# 智慧校园一站式服务小程序

![WeChat Mini Program](https://img.shields.io/badge/WeChat-Mini%20Program-07C160)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933)
![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E)

面向校园场景的一站式微信小程序，提供新闻资讯、校园交流、消息通知、个人中心、学习工具和后台管理能力。项目包含完整小程序前端、Node.js 接口服务和 MySQL 初始化脚本，适合作为课程设计、毕业设计、校园服务平台原型或二次开发基础。

English: A WeChat Mini Program campus service platform with news, posts, messages, profile center, tools, Node.js APIs and MySQL storage.

## 项目亮点

- 前后端完整：小程序页面、接口服务、数据库脚本和后台管理页面都已包含。
- 校园场景清晰：新闻资讯、校园交流、消息通知、个人中心和学习工具覆盖常见校园服务。
- 易于部署：后端使用 Express + MySQL，配置项集中在 `.env` 中。
- 安全配置：仓库只保留 `.env.example`，不提交真实密钥和数据库密码。
- 可扩展：帖子、收藏、浏览记录、反馈、活动等能力可以继续扩展成正式校园平台。

## 功能模块

| 模块 | 功能 |
| --- | --- |
| 首页 | 校园服务入口、学习工具、问答入口 |
| 新闻资讯 | 新闻列表、分类筛选、详情查看、浏览与点赞 |
| 校园交流 | 帖子列表、发布帖子、帖子详情、点赞、收藏、浏览记录 |
| 消息通知 | 系统消息与校园通知展示 |
| 个人中心 | 个人资料、本地收藏、历史记录、草稿箱、活动与反馈 |
| 后台服务 | Node.js API、MySQL 数据存储、管理后台页面 |

## 技术栈

- 微信小程序原生开发
- JavaScript / WXML / WXSS
- Node.js + Express
- MySQL
- dotenv / mysql2 / cors

## 目录结构

```text
.
├── app.js                  # 小程序入口
├── pages/                  # 小程序页面
├── components/             # 公共组件
├── utils/                  # 前端工具方法
├── images/                 # 图片资源
├── backend/                # Node.js 接口服务与管理后台
│   ├── server.js
│   ├── init.sql
│   ├── .env.example
│   └── admin/
└── project.config.json     # 微信开发者工具配置
```

## 快速开始

克隆项目：

```bash
git clone https://github.com/Davin-06/campus-service-mini-program.git
cd campus-service-mini-program
```

安装后端依赖：

```bash
cd backend
npm install
```

复制环境变量文件：

```bash
copy .env.example .env
```

修改 `backend/.env`：

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

初始化数据库：

```bash
mysql -u root -p < init.sql
```

启动后端服务：

```bash
npm start
```

默认接口地址：

```text
http://127.0.0.1:3000/api
```

## 小程序导入

1. 打开微信开发者工具。
2. 选择“导入项目”，目录选择本仓库根目录。
3. 将 `project.config.json` 中的 `appid` 替换为自己的小程序 AppID。
4. 本地调试时保留 `app.js` 中的 `apiBaseUrl` 为 `http://127.0.0.1:3000/api`。
5. 正式上线时将 `apiBaseUrl` 改为已备案并在微信公众平台配置过的 HTTPS 合法域名。

## 后台管理

后端管理页面位于：

```text
backend/admin/index.html
```

启动接口服务后，可以在浏览器打开该文件或部署到同一后台服务中使用。

## 发布前检查

- `backend/.env` 不要提交到 GitHub。
- 数据库密码、服务端密钥和第三方服务密钥只放在服务器环境变量中。
- `app.js` 中的 `apiBaseUrl` 必须使用 HTTPS 正式域名。
- 微信公众平台需要配置 request 合法域名。
- `project.config.json` 需要替换为自己的小程序 AppID。
- 后端服务器、防火墙、数据库权限和跨域配置需要提前验证。

## 常用命令

```bash
# 安装依赖
cd backend
npm install

# 启动后端
npm start

# 开发模式
npm run dev
```

## 安全说明

仓库不包含真实接口密钥、数据库密码和本地开发者私有配置。以下文件已被忽略，不应提交：

- `backend/.env`
- `backend/node_modules/`
- `project.private.config.json`
- 日志文件和系统缓存文件

## 适合用于

- 微信小程序课程设计
- 校园服务平台原型
- 前后端分离实践项目
- Node.js + MySQL 接口开发练习
- 小程序毕业设计基础版本