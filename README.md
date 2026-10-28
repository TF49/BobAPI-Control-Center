# BobAPI Control Center (BCC)

> **产品定位：** BobAPI Control Center 是一个集项目入口导航、网站可用性监控、历史状态追溯与统一管理于一体的轻量级 SaaS 控制台。

---

## 一、核心特性

1. **公开项目导航门户 (`/`)**
   - 集中呈现 BobAPI 现有各子域名项目入口（VPN、Tools、Project、Monitor、AI Helper、Invoice）。
   - 实时运行状态健康徽标（UP 正常在线、DOWN 访问异常、UNKNOWN 检测中）。
   - 实时响应时间（ms）与最近检查时间，每 30 秒自动倒计时刷新。
   - 一键新标签页安全跳转。

2. **网站可用性自动监控引擎**
   - **自动化调度：** 基于 Spring Scheduler 线程池，每隔 10 分钟自动对启用监控的项目发起 HTTP GET 检测。
   - **受控复查与防抖动：** 首次检测失败后，自动延迟 1 秒执行复查；两次均失败时才将当前确认状态标记为异常，防止网络短暂抖动误报。
   - **SSRF 安全防护：** 强制限制为 HTTPS 协议，严格校验目标域名白名单（限制为 `*.bob-api.com` 及 `*.bobdong.cn`），解析 DNS 彻底阻断私网 IP（10.x, 172.16-31.x, 192.168.x）、本地回环（127.0.0.1）及云厂商元数据服务（169.254.169.254）。
   - **手动即时检查：** 管理员可在列表或详情页随时点击“立即检查”触发即时检测并获取实时响应。

3. **管理控制台 (`/admin`)**
   - **仪表盘大屏：** 项目总览、在线率统计、平均响应延迟指标卡片，集成 ECharts 24小时 / 7天 / 30天可用率与延迟趋势折线图。
   - **项目管理：** 支持项目增删改查、排序值调整、公开显示开关、自动监控开关、自定义超时时间与期望状态码（如 `200-299`）。
   - **项目监控详情：** 单项目独立视图，展示 24 小时及 7 天可用率（样本加权算法）、历史检查明细与小时级延迟波动曲线。
   - **监控历史日志：** 完整审计历史记录，支持按项目、检查结果（UP/DOWN）、HTTP 状态码、异常类型与时间范围多维检索与分页。
   - **系统配置：** 支持在线配置默认检查间隔、超时时限、受控复查开关、公开首页刷新间隔、历史日志保留周期及显示时区。
   - **邮件告警设置：** 支持在线动态配置 SMTP 服务器、SSL 加密、发信凭据与多接收人邮箱列表，提供常见服务商（QQ、163、飞书、阿里企业邮、Gmail）一键预设，并支持一键“发送测试邮件”即时验证连通性。

4. **自动化邮件告警系统**
   - **状态驱动触发：** 仅在状态流转时发出通知，在受控二次复核确认宕机（`UP -> DOWN`）时发送红色预警邮件；服务恢复（`DOWN -> UP`）时发送绿色恢复通知并自动计算通报故障停机时长。
   - **异步无阻塞调度：** 基于独立专用线程池（`mailTaskExecutor`）异步派发邮件，防止网络或 SMTP 耗时阻塞主探测循环。
   - **响应式 HTML 卡片模版：** 采用美观清晰的现代化 HTML 卡片邮件，包含项目地址、错误类型摘要、HTTP 状态码、响应耗时、时间戳及直达按钮。

5. **安全与认证体系**
   - 管理接口由 Spring Security + JWT Bearer Token 鉴权保护。
   - 管理员密码采用高强度 BCrypt 哈希算法存储。
   - 统一 RESTful API 规范与全局异常拦截（脱敏错误日志，禁止敏感凭证泄露）。

---

## 二、工程目录结构说明

本项目采用符合您要求的**一体化轻量单体结构**：
- **后端代码：** 位于 `src/` 目录（标准 Maven 工程结构），根目录直接通过 `pom.xml` 统一管理。
- **前端代码：** 位于根目录 `resource/` 文件夹（基于 React 18 + TypeScript + Vite + Tailwind CSS + Radix UI / shadcn 风格 + Lucide React + Zustand + TanStack Query + Recharts）。
- **打包输出：** 前端生产构建产物自动输出至 `src/main/resources/static/`，与 Spring Boot 融为单一独立可执行 JAR。

```text
BobAPI Control Center/
├── pom.xml                               # 根工程 Maven 依赖与构建配置
├── Dockerfile                            # 后端 + 前端静态资源一体化镜像构建
├── docker-compose.yml                    # Docker 一键编排文件 (App + MySQL + Nginx)
├── README.md                             # 项目使用与部署说明文档
├── writing-block.md                      # 产品需求规格说明书 (PRD)
│
├── src/                                  # 【后端核心工程】
│   ├── main/
│   │   ├── java/com/bobapi/bcc/
│   │   │   ├── BccApplication.java       # Spring Boot 启动类
│   │   │   ├── common/                   # 统一响应包装 Result、错误码枚举与全局异常处理器
│   │   │   ├── config/                   # Spring Security、JWT、线程池、SPA 资源路由配置
│   │   │   ├── controller/               # RESTful 接口 (Public、Auth、Project、Monitor、Settings)
│   │   │   ├── dto/                      # 接口请求与返回 DTO 模型
│   │   │   ├── entity/                   # MyBatis-Plus 数据库实体映射
│   │   │   ├── mapper/                   # MyBatis-Plus 数据访问接口与统计聚合 SQL
│   │   │   ├── monitor/                  # 定时任务调度器、监控执行器、SSRF 安全校验器
│   │   │   ├── security/                 # JWT 令牌解析、UserDetails 与密码编码器
│   │   │   └── service/                  # 业务逻辑接口及其实现层 (impl)
│   │   └── resources/
│   │       ├── application.yml           # 全局配置 (数据库环境解耦、JWT、线程池、域名白名单)
│   │       ├── db/migration/             # Flyway 数据库版本化迁移脚本
│   │       │   ├── V1__init_schema.sql   # 初始核心数据表结构
│   │       │   ├── V2__seed_initial_data.sql # 预置管理员及初始 5 个项目
│   │       │   └── V3__add_invoice_project.sql # 增补发票管理系统项目
│   │       └── static/                   # 前端编译输出的静态资源目录 (HTML/CSS/JS)
│   └── test/
│       └── java/com/bobapi/bcc/          # Spring Boot 单元与集成测试用例
│
├── resource/                             # 【前端源码工程】
│   ├── package.json                      # 前端依赖配置
│   ├── vite.config.ts                    # Vite 构建配置 (构建输出指向 ../src/main/resources/static)
│   ├── tailwind.config.js                # Tailwind CSS 现代主题配置
│   ├── index.html                        # 页面入口
│   └── src/
│       ├── api/                          # 后端 Axios 请求封装 (client, auth, project, monitor, settings)
│       ├── components/                   # shadcn/ui 组件与可视化通用业务组件 (StatusBadge, MetricCard, TrendChart 等)
│       ├── layouts/                      # 控制台整体布局 (AdminLayout)
│       ├── pages/                        # 页面视图 (HomePage, LoginPage, Dashboard, Projects, Detail, History, Settings)
│       ├── stores/                       # Zustand 状态管理 (authStore)
│       ├── styles/                       # 全局 Tailwind 样式与主题变量
│       └── types/                        # TypeScript 类型定义
│
└── nginx/
    └── nginx.conf                        # 生产环境 Nginx 反代与静态缓存配置
```

---

## 三、初始项目与默认管理员凭据

### 1. 预置的子域名项目
系统通过 Flyway 自动完成以下项目的初始数据录入：
1. **VPN：** `https://vpn.bob-api.com/` (默认排序: 1)
2. **Tools：** `https://tools.bob-api.com/` (默认排序: 2)
3. **Project：** `https://project.bob-api.com/` (默认排序: 3)
4. **Monitor：** `https://monitor.bob-api.com/` (默认排序: 4)
5. **AI Helper：** `https://helper.bob-api.com/` (默认排序: 5)
6. **Invoice：** `https://fp.bobdong.cn/` (默认排序: 6)

### 2. 初始管理员账号
- **用户名：** `admin`
- **默认密码：** `admin123`
*(注：首次进入后台后，请在设置中修改相关敏感凭据)*

---

## 四、本地开发与运行指南

### 1. 环境变量配置
系统支持通过系统环境变量提供数据库密码。未配置时将使用默认配置：
- `DB_URL`：`jdbc:mysql://localhost:3306/bcc_db?useUnicode=true&characterEncoding=utf-8&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true`
- `DB_USERNAME`：`root`
- `DB_PASSWORD`：`200649` *(可通过环境变量注入覆盖)*

### 2. 前端独立开发模式（热重载）
```bash
# 进入前端源码目录
cd resource

# 安装依赖 (若未安装)
pnpm install

# 启动本地 Vite 开发服务器 (默认端口 5173，自动反代后端 8080)
pnpm dev
```

### 3. 后端本地启动
```bash
# 在项目根目录下执行
mvn spring-boot:run
```
服务启动后：
- 公开项目导航首页：`http://localhost:8080/`
- 管理员登录：`http://localhost:8080/login`
- 管理控制台：`http://localhost:8080/admin`
- 健康检查探针：`http://localhost:8080/actuator/health`

### 4. 一键构建生产一体化 Fat JAR
```bash
# 步骤 1：构建前端并输出到 static
cd resource
pnpm build
cd ..

# 步骤 2：打包后端可执行 JAR
mvn package -DskipTests
```
打包成功后，将在 `target/` 目录下生成 `bcc-1.0.0.jar`，可直接独立运行：
```bash
java -jar target/bcc-1.0.0.jar
```

---

## 五、Docker 容器化部署

本项目提供了完整的 `docker-compose.yml` 编排配置，支持一键在生产服务器部署运行：

```bash
# 启动 MySQL、BCC 后端及前端服务
docker compose up -d
```
启动后：
- 前端 Nginx 服务监听宿主机 `8888` 端口（`${FRONTEND_PORT:-8888}`）。
- 后端 Spring Boot 服务监听宿主机 `8082` 端口（`${BACKEND_PORT:-8082}`）。
- MySQL 数据库仅在内部网络通信，不暴露宿主机端口，数据自动持久化到 Docker 卷 `mysql-data`。
- 后端自带健康检查，确保 MySQL 正常就绪后再自动启动并执行 Flyway 迁移。
