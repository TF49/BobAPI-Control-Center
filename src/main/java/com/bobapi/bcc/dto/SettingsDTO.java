package com.bobapi.bcc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettingsDTO {
    private Integer defaultCheckInterval;
    private Integer defaultTimeoutSeconds;
    private Boolean retryOnFailure;
    private Integer publicRefreshInterval;
    private Integer historyRetentionDays;
    private String displayTimezone;

    // 邮件告警相关配置
    private Boolean emailAlertEnabled;
    private String smtpHost;
    private Integer smtpPort;
    private String smtpUsername;
    private String smtpPassword;
    private Boolean smtpSslEnabled;
    private String smtpFrom;
    private String alertRecipientEmails;
}
