-- V9__update_default_and_projects_timeout_to_60s.sql
-- 将默认探测超时时间以及历史存量项目的超时时间由 10s/5s 统一升级调整为 60s (一分钟)

-- 1. 更新全局系统配置默认超时为 60 秒
UPDATE system_config 
SET config_value = '60' 
WHERE config_key = 'default_timeout_seconds';

-- 2. 修改 sys_project 表的 timeout_seconds 列默认值为 60 秒
ALTER TABLE sys_project 
MODIFY COLUMN timeout_seconds INT NOT NULL DEFAULT 60 COMMENT '请求超时时间(秒)';

-- 3. 批量将所有现有项目中超时时间低于 60 秒的项目统一调整为 60 秒
UPDATE sys_project 
SET timeout_seconds = 60 
WHERE timeout_seconds < 60 OR timeout_seconds IS NULL;
