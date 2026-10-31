-- V7__add_dy_bobdong_project.sql
-- 增加 DY 短视频解析去水印系统 (https://dy.bobdong.cn/) 网站监控与导航配置

INSERT INTO sys_project (name, code, url, description, icon, category, sort_order, is_enabled, is_monitor_enabled, check_interval, timeout_seconds, expected_status_code, current_status)
VALUES 
('DY Video', 'dy-video', 'https://dy.bobdong.cn/', '多平台无水印短视频解析与下载服务（支持抖音、TikTok、小红书、B站等）', 'Video', '实用工具', 9, 1, 1, 600, 10, '200-299', 'UNKNOWN')
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    url = VALUES(url),
    description = VALUES(description),
    icon = VALUES(icon),
    category = VALUES(category),
    sort_order = VALUES(sort_order),
    updated_at = CURRENT_TIMESTAMP;
