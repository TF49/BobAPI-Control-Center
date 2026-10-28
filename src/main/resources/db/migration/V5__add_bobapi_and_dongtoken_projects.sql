-- V5__add_bobapi_and_dongtoken_projects.sql
-- 增加 Bob API (https://bob-api.com/) 与 DongToken (https://dongtoken.com/) 网站监控与导航配置

INSERT INTO sys_project (name, code, url, description, icon, category, sort_order, is_enabled, is_monitor_enabled, check_interval, timeout_seconds, expected_status_code, current_status)
VALUES 
('Bob API', 'bob-api', 'https://bob-api.com/', 'BobAPI 官方开放平台与统一大模型 API 接口分发服务', 'Cpu', '核心服务', 7, 1, 1, 600, 10, '200-299', 'UNKNOWN'),
('DongToken', 'dongtoken', 'https://dongtoken.com/', 'DongToken AI 令牌中转与密钥额度管理平台', 'Key', '令牌服务', 8, 1, 1, 600, 10, '200-299', 'UNKNOWN')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    url = VALUES(url),
    description = VALUES(description),
    icon = VALUES(icon),
    category = VALUES(category),
    sort_order = VALUES(sort_order),
    updated_at = CURRENT_TIMESTAMP;
