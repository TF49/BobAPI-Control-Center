-- V2__seed_initial_data.sql
-- Seed initial admin user and 5 preset projects

-- 初始管理员账号: admin / admin123
INSERT INTO sys_user (username, password_hash, nickname, role, status)
VALUES ('admin', '$2a$10$iNFsNY8IR2AnSjiguOjjA./qnEavnsFWUhGxXFDLkuGTqbyW/nKHG', '系统管理员', 'ROLE_ADMIN', 1)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 初始5个项目 (PRD 第四章)
INSERT INTO sys_project (name, code, url, description, icon, category, sort_order, is_enabled, is_monitor_enabled, check_interval, timeout_seconds, expected_status_code, current_status)
VALUES 
('VPN', 'vpn', 'https://vpn.bob-api.com/', 'BobAPI 专属安全网络通道与连接服务', 'Lock', '基础网络', 1, 1, 1, 600, 10, '200-299', 'UNKNOWN'),
('Tools', 'tools', 'https://tools.bob-api.com/', '常用开发与自动化提效小工具集', 'Tools', '研发工具', 2, 1, 1, 600, 10, '200-299', 'UNKNOWN'),
('Project', 'project', 'https://project.bob-api.com/', '项目协同、任务排期与管理系统', 'Collection', '项目协同', 3, 1, 1, 600, 10, '200-299', 'UNKNOWN'),
('Monitor', 'monitor', 'https://monitor.bob-api.com/', '服务器基础监控与指标大屏', 'Monitor', '运维监控', 4, 1, 1, 600, 10, '200-299', 'UNKNOWN'),
('AI Helper', 'ai-helper', 'https://helper.bob-api.com/', '大模型智能助手与业务问答系统', 'ChatDotRound', '人工智能', 5, 1, 1, 600, 10, '200-299', 'UNKNOWN')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 初始系统配置
INSERT INTO system_config (config_key, config_value, description)
VALUES
('default_check_interval', '600', '默认检查周期(秒)'),
('default_timeout_seconds', '10', '默认请求超时(秒)'),
('retry_on_failure', 'true', '失败是否进行受控复查'),
('public_refresh_interval', '30', '公开首页自动刷新间隔(秒)'),
('history_retention_days', '30', '监控历史数据保留天数'),
('display_timezone', 'Asia/Shanghai', '页面展示时区')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
