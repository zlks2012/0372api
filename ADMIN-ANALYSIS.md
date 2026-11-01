# 后台推演：从前台逆向 Emooo.cc 管理面板

通过分析前端 SPA 路由、API 请求路径、组件结构和公开配置，
推演出完整的管理后台架构。

## 技术架构

后台与前台共用同一套 Vue SPA，通过路由守卫区分权限：

- 前台路由 `/home`、`/login`、`/register`、`/dashboard` 等
- 管理路由 `/admin/*`，需要 `role === "admin"`
- 同一套 `AppLayout` 组件，切换 sidebar 内容

API 前缀 `/api/v1/admin/*`，与前台 `/api/v1/*` 并行。

## 管理页面结构（42 个路由）

### 核心管理

| 路由 | 页面 | 功能 |
|------|------|------|
| `/admin/dashboard` | 管理仪表盘 | 全站统计、实时流量、用户排行、趋势图 |
| `/admin/users` | 用户管理 | CRUD、余额调整、角色管理、批量操作 |
| `/admin/groups` | 分组管理 | 模型分组、倍率设置、模型列表、容量 |
| `/admin/channels/pricing` | 渠道管理 | 上游渠道、模型映射、价格配置 |
| `/admin/channels/monitor` | 渠道监控 | 可用性探测、延迟、成功率 |

### 财务系统（12 个子页面）

| 路由 | 功能 |
|------|------|
| `/admin/finance` | 财务总览 |
| `/admin/finance/recharge-activities` | 充值活动管理 |
| `/admin/finance/merchant-settlements` | 商户结算 |
| `/admin/finance/purchase-costs` | 账户/号池成本 |
| `/admin/finance/operating-expenses` | 运营支出 |
| `/admin/finance/refund-debts` | 退款负债 |
| `/admin/finance/debt-repayments` | 债务催收 |
| `/admin/finance/usage-credits` | 消费纠错退回 |
| `/admin/finance/subscription-reconciliation` | 订阅对账 |
| `/admin/finance/subscription-affiliate-recoveries` | 订阅返利应收 |
| `/admin/finance/archive` | 历史归档 |
| `/admin/finance/accounts/:id` | 单账户财务详情 |

### 订单与支付

| 路由 | 功能 |
|------|------|
| `/admin/orders` | 订单管理 |
| `/admin/orders/dashboard` | 支付仪表盘 |
| `/admin/orders/plans` | 订阅套餐管理 |

### 运营与风控

| 路由 | 功能 |
|------|------|
| `/admin/ops` | 运维监控（错误分布、延迟直方图、吞吐趋势） |
| `/admin/operations-workbench` | 运营工作区 |
| `/admin/risk-control` | 风控（API 指纹、频率限制） |
| `/admin/audit-logs` | 审计日志 |
| `/admin/prompt-audit` | Prompt 审计 |
| `/admin/ingress-whitelist` | 下游 IP 白名单 |

### 推广与营销

| 路由 | 功能 |
|------|------|
| `/admin/affiliates/promoters` | 推广者管理 |
| `/admin/affiliates/invites` | 邀请记录 |
| `/admin/affiliates/rebates` | 返利记录 |
| `/admin/affiliates/transfers` | 转账记录 |
| `/admin/affiliates/redeem-campaigns` | 推广活动 |
| `/admin/redeem` | 兑换码管理 |
| `/admin/promo-codes` | 促销码管理 |
| `/admin/welfare-cards` | 福利卡管理 |
| `/admin/announcements` | 公告管理 |

### 系统配置

| 路由 | 功能 |
|------|------|
| `/admin/settings` | 系统设置（SMTP、限流、Web 搜索、超时等） |
| `/admin/subscription-workspace` | 订阅工作区 |
| `/admin/account-concurrency` | 账户并发与分流 |
| `/admin/proxies` | 代理池管理 |
| `/admin/plugins` | 插件管理 |
| `/admin/qq-bot` | QQ 机器人 |
| `/admin/prompt-audit` | Prompt 审计 |
| `/admin/support` | 工单管理 |
| `/admin/usage` | 用量记录 |

## 推演的数据模型

### User

```
id, username, email, password_hash, role (admin/user),
balance (decimal), quota (int), used_quota (int),
group (string), status (active/disabled),
created_at, last_login_at
```

### Channel

```
id, name, type (openai/claude/gemini/grok/...),
base_url, api_key, models (json array),
group_id, priority (int), weight (int),
status (enabled/disabled), created_at
```

### Group

```
id, name, description, ratio (decimal),
models (json array), capacity (int),
sort_order (int), dispatch_capabilities
```

### Order / Payment

```
id, user_id, amount, currency, plan_id,
status (pending/paid/failed/refunded),
payment_provider, created_at
```

### Subscription

```
id, user_id, plan_id, status (active/expired),
starts_at, expires_at, auto_renew
```

## 后台 API 端点分布（约 200+ 端点）

| 前缀 | 端点数（估算） | 核心操作 |
|------|--------------|---------|
| `/admin/users` | 20+ | CRUD、余额调整、批量限制、退款准备 |
| `/admin/channels` | 15+ | CRUD、模型同步、价格表、监控 |
| `/admin/groups` | 10+ | CRUD、排序、容量、调度 |
| `/admin/finance` | 25+ | 总览、充值、退款、对账、结算 |
| `/admin/orders` | 10+ | 列表、仪表盘、套餐 |
| `/admin/ops` | 20+ | 错误、延迟、吞吐、告警、日志 |
| `/admin/settings` | 15+ | SMTP、限流、Web 搜索、系统参数 |
| `/admin/affiliates` | 10+ | 推广者、邀请、返利、转账 |
| `/admin/redeem` | 8+ | 生成、导出、统计、批量操作 |
| `/admin/system` | 5+ | 版本、更新、重启、回滚 |

## 前台到后台的映射关系

| 前台功能 | 对应后台模块 |
|---------|------------|
| 用户注册/登录 | 用户管理 |
| API 密钥管理 | 用户管理 + 渠道管理 |
| 充值/订阅 | 订单管理 + 财务中心 |
| 使用记录 | 用量记录 + 运维监控 |
| 模型广场 | 渠道管理 + 分组管理 |
| 工单 | 工单管理 |
| 公告展示 | 公告管理 |
| 推广返利 | 推广者管理 + 财务中心 |
| 兑换码 | 兑换码管理 |
| 风控验证 | 风控管理 |
| 服务状态 | 渠道监控 + 运维监控 |

## 前端组件推断

每个后台页面都使用统一模式：

1. `TablePageLayout` - 标准表格页
2. `DataTable` - 数据表格（支持排序、分页、选择）
3. `Pagination` - 分页
4. `ConfirmDialog` - 删除/操作确认
5. `Toast` - 操作反馈
6. 筛选器组合（Select、SearchInput、Toggle）

Dashboard 页面额外使用：

- `ModelDistributionChart` - 模型分布饼图
- `GroupDistributionChart` - 分组分布
- `EndpointDistributionChart` - 端点分布
- `TokenUsageTrend` - Token 用量趋势
- `V3RollNumber` - 数字滚动动画

## 总结

后台是一个功能完整的 SaaS 管理面板，覆盖：

- 用户生命周期（注册→使用→充值→退款）
- AI 模型供应链（上游渠道→分组→密钥→用量计费）
- 财务闭环（收入→成本→利润→结算→对账）
- 运维保障（监控→告警→日志→回滚）
- 营销体系（推广→邀请→返利→兑换）

从 API 端点数量（200+）和页面复杂度来看，
这是一个生产级的 AI 中转站管理系统。
