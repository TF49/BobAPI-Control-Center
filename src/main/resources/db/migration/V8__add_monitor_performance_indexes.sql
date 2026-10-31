-- V8__add_monitor_performance_indexes.sql
-- 为监控检查历史表新增高频筛选与统计聚合组合索引，彻底杜绝慢查询与大表扫描卡顿

-- 1. 探测状态 + 检查时间组合索引（用于按成功/失败过滤并按时间倒序快速分页）
CREATE INDEX idx_success_check_time ON monitor_check_result (is_success, check_time);

-- 2. 触发方式 + 检查时间组合索引（用于按调度计划/手动触发过滤并按时间倒序快速分页）
CREATE INDEX idx_trigger_check_time ON monitor_check_result (trigger_type, check_time);

-- 3. 覆盖索引（用于 24小时 / 7天 / 30天全网及单项目 SLA 可用率与加权平均延迟聚合计算）
CREATE INDEX idx_check_time_success_latency ON monitor_check_result (check_time, is_success, response_time);
