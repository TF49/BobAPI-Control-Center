# =========================================================================
# BobAPI Control Center Dockerfile
# =========================================================================

# Stage 1: Runtime
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 设置时区为 UTC / Shanghai
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

# 拷贝构建好的一体化可执行 JAR
COPY target/bcc-1.0.0.jar app.jar

ENV SERVER_PORT=8080 \
    DB_URL="jdbc:mysql://mysql:3306/bcc_db?useUnicode=true&characterEncoding=utf-8&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true" \
    DB_USERNAME=root \
    DB_PASSWORD=root_secure_password_2026 \
    JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
