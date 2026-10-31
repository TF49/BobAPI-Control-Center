-- V6__update_admin_password.sql
-- 重置默认管理员 admin 密码，替换默认弱口令 admin123 为高强度安全密码
UPDATE sys_user 
SET password_hash = '$2a$10$yYhkzAvddTJoXGFm.Xn9g.32twwrXnWIz98HOe2z2K/m8xvFjJkqi',
    updated_at = CURRENT_TIMESTAMP
WHERE username = 'admin';
