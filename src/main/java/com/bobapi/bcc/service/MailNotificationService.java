package com.bobapi.bcc.service;

import com.bobapi.bcc.dto.TestEmailRequestDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;

import java.time.Duration;

public interface MailNotificationService {

    /**
     * 发送测试邮件（同步执行，校验 SMTP 配置连通性）
     */
    void sendTestEmail(TestEmailRequestDTO testRequest);

    /**
     * 异步触发项目状态变更告警或恢复通知
     */
    void sendAlertNotification(Project project, MonitorCheckResult result, String oldStatus, String newStatus, Duration downtime);
}
