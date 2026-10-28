package com.bobapi.bcc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TestEmailRequestDTO {
    /**
     * 可选：若页面表单已输入但未保存，可优先使用传入的测试配置
     */
    private String smtpHost;
    private Integer smtpPort;
    private String smtpUsername;
    private String smtpPassword;
    private Boolean smtpSslEnabled;
    private String smtpFrom;

    /**
     * 测试邮件接收人（若为空，默认发送给配置的 alertRecipientEmails 中的首个邮箱）
     */
    private String testRecipient;
}
