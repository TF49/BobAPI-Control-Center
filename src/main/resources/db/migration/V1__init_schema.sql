-- V1__init_schema.sql
-- Initial Schema for BobAPI Control Center (BCC)

CREATE TABLE IF NOT EXISTS sys_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(100) NOT NULL COMMENT 'BCrypt密码哈希',
    nickname VARCHAR(50) COMMENT '昵称',
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_ADMIN' COMMENT '角色',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统管理员表';

CREATE TABLE IF NOT EXISTS sys_project (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    name VARCHAR(100) NOT NULL COMMENT '项目名称',
    code VARCHAR(50) NOT NULL UNIQUE COMMENT '项目英文唯一标识',
    url VARCHAR(500) NOT NULL COMMENT '项目HTTPS访问地址',
    description VARCHAR(500) COMMENT '项目描述',
    icon VARCHAR(100) COMMENT '图标标识',
    category VARCHAR(50) DEFAULT 'default' COMMENT '项目分类',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序值(越小越靠前)',
    is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否在公开首页启用(1-启用, 0-停用)',
    is_monitor_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用定时监控(1-启用, 0-停用)',
    check_interval INT NOT NULL DEFAULT 600 COMMENT '检查间隔(秒)',
    timeout_seconds INT NOT NULL DEFAULT 10 COMMENT '请求超时时间(秒)',
    expected_status_code VARCHAR(50) NOT NULL DEFAULT '200-299' COMMENT '期望状态码范围',
    current_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN' COMMENT '当前确认状态: UP, DOWN, UNKNOWN',
    last_check_status VARCHAR(20) COMMENT '最近一次单次检查结果: UP, DOWN',
    last_check_time DATETIME COMMENT '最近一次检查时间(UTC)',
    last_response_time BIGINT COMMENT '最近一次响应时间(毫秒)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_is_enabled_sort (is_enabled, sort_order),
    INDEX idx_monitor_enabled (is_monitor_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导航与监控项目表';

CREATE TABLE IF NOT EXISTS monitor_check_result (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    project_id BIGINT NOT NULL COMMENT '关联sys_project.id',
    check_time DATETIME NOT NULL COMMENT '检查开始时间(UTC)',
    end_time DATETIME COMMENT '检查结束时间(UTC)',
    is_success TINYINT(1) NOT NULL COMMENT '是否成功: 1-成功, 0-失败',
    http_status INT COMMENT 'HTTP状态码',
    response_time BIGINT COMMENT '响应耗时(毫秒)',
    error_type VARCHAR(50) COMMENT '错误类型',
    error_summary VARCHAR(500) COMMENT '脱敏错误摘要',
    retry_count INT NOT NULL DEFAULT 0 COMMENT '重试次数(0表示首次检查)',
    trigger_type VARCHAR(20) NOT NULL DEFAULT 'SCHEDULE' COMMENT '触发来源: SCHEDULE, MANUAL',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_project_check_time (project_id, check_time),
    INDEX idx_check_time (check_time),
    INDEX idx_is_success (is_success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站可用性监控检查结果历史表';

CREATE TABLE IF NOT EXISTS system_config (
    id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    config_key VARCHAR(100) NOT NULL UNIQUE COMMENT '配置项键名',
    config_value TEXT NOT NULL COMMENT '配置项值',
    description VARCHAR(255) COMMENT '配置项描述',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='全局监控与系统配置表';
