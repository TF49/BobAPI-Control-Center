# BobAPI Control Center (BCC) 离线部署包使用说明

本目录为 **BobAPI Control Center** 的离线独立部署包，支持在任意安装了 Docker 及 Docker Compose 的服务器上极速离线部署。

---

## 一、部署文件清单

将 `deploy` 目录中的以下文件上传至目标服务器同一个工作目录（如 `/opt/bcc`）：
- `bcc-backend.tar`：后端 Spring Boot 核心服务 Docker 镜像离线包
- `bcc-frontend.tar`：前端 React SPA + Nginx 反向代理 Docker 镜像离线包
- `docker-compose.yml`：三容器（MySQL 8 + 后端 + 前端）编排文件
- `.env.example`：生产环境变量示例模板
- `deploy.sh`：（可选）一键全自动部署 Shell 脚本

---

## 二、快速部署步骤

### 方式 1：一键脚本部署（推荐）
在服务器的部署目录下赋予脚本执行权限并运行：
```bash
chmod +x deploy.sh
./deploy.sh
```

---

### 方式 2：手动执行步骤

#### 1. 导入前后端 Docker 镜像
```bash
docker load -i bcc-backend.tar
docker load -i bcc-frontend.tar
```

#### 2. 配置环境变量
```bash
cp .env.example .env
# 可使用 vim 编辑 .env 修改数据库密码或端口（如有需要）
vim .env
```

#### 3. 一键启动服务
```bash
docker compose up -d
```

#### 4. 检查运行状态
```bash
# 查看容器健康状态
docker compose ps

# 查看后端日志
docker compose logs -f backend

# 查看前端/反代日志
docker compose logs -f frontend
```

---

## 三、访问地址与默认凭据

- **前端页面 / 控制台入口：** `http://<服务器IP>:${FRONTEND_PORT:-8888}/`
- **后台管理控制台：** `http://<服务器IP>:${FRONTEND_PORT:-8888}/admin`
- **后端 API 接口：** `http://<服务器IP>:${BACKEND_PORT:-8082}/`
- **后端健康检查端点：** `http://<服务器IP>:${BACKEND_PORT:-8082}/actuator/health` (也可通过前端反代 `http://<服务器IP>:${FRONTEND_PORT:-8888}/actuator/health`)

### 默认管理员账号
- **用户名：** `admin`
- **初始密码：** `BccAdmin#2026!SecOps99`
*(注：生产环境请务必妥善保管该高强度凭据)*

---

## 四、常用维护命令

```bash
# 停止所有服务
docker compose stop

# 重启所有服务
docker compose restart

# 销毁容器但保留数据卷
docker compose down

# 彻底重置所有数据（谨慎操作）
docker compose down -v
```
