# 0372api.top - AI API Gateway

独立部署的 AI API 中转站前端 + 后端，运行在自己的服务器上。

## 项目简介

完整的 AI API Gateway 系统，包含 Vue SPA 前端（361 个资产文件）和 Node.js 后端 API 服务器。支持用户注册、登录、API 密钥管理、管理面板、渠道管理、公告系统等完整功能。

## 快速启动

```bash
# 1. 构建前端
node node_modules/next/dist/bin/next build
node scripts/patch-edge-build-id.js

# 2. 启动后端 API (端口 3000)
node server/index.js

# 3. 启动前端 (端口 80)
node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port 80
```

或使用一键启动脚本：

```powershell
.start.ps1
```

## 系统架构

```
0372api.top → 127.0.0.1
    ├── port 80   → Next.js 前端 (静态 SPA + API 反向代理)
    └── port 3000 → Node.js API 后端
                      └── server/data.json (JSON 文件数据库)
```

## 目录结构

```
├── server/                    # Node.js API 后端
│   ├── index.js               # 主服务器（用户认证、API 密钥、用量等）
│   ├── admin.js               # 管理面板 API（225+ 端点）
│   ├── db.js                  # JSON 数据库（密码哈希、令牌生成）
│   └── data.json              # 数据存储文件
├── public/
│   ├── index.html             # SPA HTML 入口
│   ├── favicon.ico            # 网站图标
│   ├── fonts/                 # 字体文件（TTF）
│   └── sites/emooo/           # 361 个 Vue SPA 资产
│       ├── *.js               # JS chunk（懒加载模块）
│       ├── *.css              # 样式文件
│       └── *.ttf              # 字体
├── src/
│   ├── middleware.ts          # Next.js 中间件（SPA 路由回退）
│   └── app/                   # Next.js App Router
├── scripts/
│   └── patch-edge-build-id.js # 构建后自动修补
├── next.config.ts             # Next.js 配置（rewrites、代理）
├── start.ps1                  # 一键启动脚本
└── CLONE-README.md            # 克隆说明
```

## 功能列表

### 用户端

- 用户注册 / 登录（邮箱 + 密码）
- API 密钥管理（创建、删除、查看）
- 用量记录查看
- 分组列表 / 可用渠道
- 订阅管理
- 充值系统
- 兑换码
- 个人设置
- 深色模式
- 响应式布局（移动端适配）
- 多语言支持（中文 / English，可扩展）

### 管理端 (/admin)

第一个注册的用户自动获得管理员权限。

| 模块 | 功能 |
|------|------|
| 仪表盘 | 全站统计、实时数据 |
| 用户管理 | CRUD、余额调整、角色、批量操作 |
| 分组管理 | 模型分组、倍率、模型列表 |
| 渠道管理 | 上游渠道、API 密钥、模型映射 |
| 渠道监控 | 可用性探测、延迟 |
| 公告管理 | 发布、编辑、删除公告 |
| 兑换码 | 批量生成、导出、统计 |
| 促销码 | 折扣码管理 |
| 支付系统 | 支付渠道、套餐、订单 |
| 运维监控 | 错误日志、延迟、吞吐 |
| 系统设置 | SMTP、限流、Web 搜索 |
| 审计日志 | 操作日志 |
| 推广系统 | 推广者、邀请、返利 |

## API 端点

### 用户端 (/api/v1/)

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | /auth/register | 用户注册 |
| POST | /auth/login | 用户登录 |
| GET | /auth/me | 当前用户信息 |
| POST | /auth/logout | 登出 |
| GET | /settings/public | 站点公开配置 |
| GET/POST | /keys | API 密钥列表 / 创建 |
| DELETE | /keys/:id | 删除密钥 |
| GET | /usage | 用量记录 |
| GET | /groups/available | 可用分组 |
| GET | /channels/available | 可用渠道 |
| GET | /announcements | 公告列表 |
| GET | /subscriptions | 订阅信息 |
| GET | /user/network | 用户 IP 信息 |

### 管理端 (/api/v1/admin/)

225+ 个端点，覆盖用户、分组、渠道、财务、订单、运维、风控等全部管理功能。

## 安全特性

- 密码使用 PBKDF2 + 随机盐哈希存储
- Bearer Token 会话认证
- API 路由权限校验（用户 / 管理员）
- CORS 跨域配置
- Next.js 中间件路由保护


## 多语言支持 / Multi-Language Support

内置国际化 (i18n) 系统，支持以下语言：

| 语言 | 代码 | 语言文件 | 状态 |
|------|------|---------|------|
| 中文（简体） | `zh` | `index-C7DuMFIL.js` | ✅ 完整 |
| English | `en` | `index-Bqdiag9l.js` | ✅ 完整 |

### 切换语言

用户可在页面右上角点击语言切换按钮，在中文和英文之间自由切换。语言偏好自动保存到浏览器 `localStorage`。

### 添加新语言

1. 复制现有语言文件作为模板：

```bash
cp public/sites/emooo/index-C7DuMFIL.js public/sites/emooo/index-<新语言代码>.js
```

2. 在 `public/index.html` 的 `__APP_CONFIG__` 中注册新语言
3. 翻译 `index-<新语言代码>.js` 中的所有字符串键值对
4. 系统自动检测浏览器语言并匹配

### 支持的翻译范围

所有 UI 界面文本均可翻译，包括：

- 导航菜单、页面标题、按钮文字
- 表单标签和占位符
- 错误消息和成功提示
- 邮件模板
- 管理面板标签
- 邮件通知模板

### 已有翻译覆盖

前端 Vue SPA 内置了完整的 i18n 框架（vue-i18n），翻译覆盖了全部 42 个管理页面和所有用户端页面的 UI 文本。新增语言只需提供翻译文件，无需修改任何代码逻辑。

## 配置说明

### 域名解析

```
0372api.top → 127.0.0.1
```

### 防火墙

确保以下端口开放：

- 80 — HTTP 前端
- 3000 — API 后端（仅内部，由 Next.js 代理）

### 管理员账号

第一个注册的用户自动成为管理员。

## 技术栈

- 前端: Vue 3 SPA (361 个文件) + Next.js 16 (App Router)
- 后端: Node.js 原生 HTTP 服务器（零依赖）
- 数据库: JSON 文件存储
- 构建: Turbopack

## 许可证

MIT
