#!/bin/bash
set -e

echo "=========================================="
echo "  BobAPI Control Center 离线部署脚本"
echo "=========================================="

# 1. 导入后端镜像
if [ -f "bcc-backend.tar" ]; then
    echo "[1/4] 正在加载后端镜像 bcc-backend.tar ..."
    docker load -i bcc-backend.tar
else
    echo "❌ 错误: 未找到 bcc-backend.tar"
    exit 1
fi

# 2. 导入前端镜像
if [ -f "bcc-frontend.tar" ]; then
    echo "[2/4] 正在加载前端镜像 bcc-frontend.tar ..."
    docker load -i bcc-frontend.tar
else
    echo "❌ 错误: 未找到 bcc-frontend.tar"
    exit 1
fi

# 3. 准备 .env 文件
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "[3/4] 未检测到 .env 文件，从 .env.example 自动创建 ..."
        cp .env.example .env
    fi
else
    echo "[3/4] 检测到已存在 .env 配置文件"
fi

# 4. 启动容器编排
echo "[4/4] 启动 Docker Compose 容器编排服务 ..."
docker compose down --remove-orphans || true
docker compose up -d

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "查看容器状态: docker compose ps"
echo "查看实时日志: docker compose logs -f"
echo "=========================================="
