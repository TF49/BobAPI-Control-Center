-- V4__add_email_alert_config.sql
-- 增加邮件告警系统配置及项目状态变更时间字段

-- 1. 项目表增加状态变更时间戳，便于计算宕机时长并在恢复时通报
ALTER TABLE sys_project ADD COLUMN status_changed_at DATETIME COMMENT '状态最近变更时间(UTC)' AFTER current_status;

-- 2. 初始插入邮件告警全局配置项
INSERT INTO system_config (config_key, config_value, description)
VALUES
('email_alert_enabled', 'false', '是否开启网站宕机与恢复邮件告警通知'),
('smtp_host', '', 'SMTP邮件发送服务器地址'),
('smtp_port', '465', 'SMTP邮件发送端口'),
('smtp_username', '', 'SMTP认证账号或发信邮箱'),
('smtp_password', '', 'SMTP授权码或独立密码'),
('smtp_ssl_enabled', 'true', '是否启用SSL/TLS加密传输'),
('smtp_from', '', '发信人邮箱或发信别名'),
('alert_recipient_emails', '', '告警接收邮箱列表(多个使用英文逗号隔开)')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
