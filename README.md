# 智慧校园一站式服务小程序

这是一个面向校园场景的微信小程序项目，包含新闻资讯、校园交流、消息通知、个人中心、学习工具和后台管理服务。

## 项目结构

- `pages/`：小程序页面
- `components/`：公共组件
- `utils/`：前端工具方法
- `backend/`：Node.js 接口服务与管理后台
- `images/`：小程序图片资源

## 本地运行

1. 使用微信开发者工具打开项目根目录。
2. 进入 `backend` 安装依赖：

```bash
npm install
```

3. 复制 `backend/.env.example` 为 `backend/.env`，填写数据库配置。
4. 启动后端服务：

```bash
npm start
```

5. 将 `app.js` 中的 `apiBaseUrl` 改为后端服务地址。正式上线时必须使用已配置的 HTTPS 合法域名。

## 注意事项

- 不要提交 `backend/.env`、数据库密码、服务端密钥等敏感信息。
- 微信小程序正式发布前，请在微信公众平台配置合法请求域名。
- `project.config.json` 中的 `appid` 使用占位值，正式开发时请替换为自己的小程序 AppID。
