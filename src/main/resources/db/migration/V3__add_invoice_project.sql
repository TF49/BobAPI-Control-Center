-- V3__add_invoice_project.sql
-- 增加发票管理系统项目 (https://fp.bobdong.cn/)

INSERT INTO sys_project (name, code, url, description, icon, category, sort_order, is_enabled, is_monitor_enabled, check_interval, timeout_seconds, expected_status_code, current_status)
VALUES 
('Invoice', 'invoice', 'https://fp.bobdong.cn/', 'BobAPI 专属发票管理系统与商户开票服务', 'Receipt', '财务服务', 6, 1, 1, 600, 10, '200-299', 'UNKNOWN')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    url = VALUES(url),
    description = VALUES(description),
    icon = VALUES(icon),
    category = VALUES(category),
    sort_order = VALUES(sort_order),
    updated_at = CURRENT_TIMESTAMP;
