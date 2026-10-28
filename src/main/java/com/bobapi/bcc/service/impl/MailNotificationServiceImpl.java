package com.bobapi.bcc.service.impl;

import com.bobapi.bcc.common.BusinessException;
import com.bobapi.bcc.common.ResultCode;
import com.bobapi.bcc.dto.SettingsDTO;
import com.bobapi.bcc.dto.TestEmailRequestDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.service.MailNotificationService;
import com.bobapi.bcc.service.SystemConfigService;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.HtmlUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Properties;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MailNotificationServiceImpl implements MailNotificationService {

    private final SystemConfigService configService;
    private final Executor mailTaskExecutor;

    public MailNotificationServiceImpl(SystemConfigService configService,
                                      @Qualifier("mailTaskExecutor") Executor mailTaskExecutor) {
        this.configService = configService;
        this.mailTaskExecutor = mailTaskExecutor;
    }

    @Override
    public void sendTestEmail(TestEmailRequestDTO request) {
        SettingsDTO rawSettings = configService.getRawSettings();

        // 优先使用请求中的参数，若为空则回退到系统当前配置
        String host = StringUtils.hasText(request.getSmtpHost()) ? request.getSmtpHost().trim() : rawSettings.getSmtpHost();
        int port = request.getSmtpPort() != null ? request.getSmtpPort() : (rawSettings.getSmtpPort() != null ? rawSettings.getSmtpPort() : 465);
        String username = StringUtils.hasText(request.getSmtpUsername()) ? request.getSmtpUsername().trim() : rawSettings.getSmtpUsername();

        String password = request.getSmtpPassword();
        if (!StringUtils.hasText(password) || "******".equals(password.trim())) {
            password = rawSettings.getSmtpPassword();
        }

        boolean sslEnabled = request.getSmtpSslEnabled() != null ? request.getSmtpSslEnabled() : Boolean.TRUE.equals(rawSettings.getSmtpSslEnabled());
        String from = StringUtils.hasText(request.getSmtpFrom()) ? request.getSmtpFrom().trim() : rawSettings.getSmtpFrom();

        String recipient = request.getTestRecipient();
        if (!StringUtils.hasText(recipient)) {
            List<String> list = parseRecipients(rawSettings.getAlertRecipientEmails());
            if (list.isEmpty()) {
                throw new BusinessException("请填写测试接收邮箱或在系统配置中设置告警接收邮箱");
            }
            recipient = list.get(0);
        }

        if (!recipient.contains("@")) {
            throw new BusinessException("测试接收邮箱格式不合法: " + recipient);
        }

        if (port <= 0 || port > 65535) {
            throw new BusinessException("SMTP 端口号非法（应在 1~65535 范围内）: " + port);
        }

        if (!StringUtils.hasText(host)) {
            throw new BusinessException("SMTP 服务器地址未配置");
        }
        if (!StringUtils.hasText(username)) {
            throw new BusinessException("SMTP 发信账号未配置");
        }
        if (!StringUtils.hasText(password)) {
            throw new BusinessException("SMTP 发信密码或授权码未配置");
        }

        JavaMailSenderImpl sender = createSender(host, port, username, password, sslEnabled);

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            InternetAddress fromAddress = buildFromAddress(from, username);
            helper.setFrom(fromAddress);
            helper.setTo(recipient.trim());
            helper.setSubject("【系统测试】BobAPI Control Center 邮件通知连通性测试");

            String html = buildTestEmailHtml(host, port, username, recipient, rawSettings.getDisplayTimezone());
            helper.setText(html, true);

            sender.send(message);
            log.info("测试邮件成功发送至: {}", recipient);
        } catch (Exception e) {
            log.error("测试邮件发送失败: ", e);
            throw new BusinessException(ResultCode.INTERNAL_SERVER_ERROR.getCode(), "SMTP 发送失败: " + e.getMessage());
        }
    }

    @Override
    public void sendAlertNotification(Project project, MonitorCheckResult result, String oldStatus, String newStatus, Duration downtime) {
        SettingsDTO settings = configService.getRawSettings();

        // 检查全局开关
        if (!Boolean.TRUE.equals(settings.getEmailAlertEnabled())) {
            log.debug("邮件告警总开关未开启，忽略项目 [{}] 的状态通知", project.getName());
            return;
        }

        String host = settings.getSmtpHost();
        String username = settings.getSmtpUsername();
        String password = settings.getSmtpPassword();
        if (!StringUtils.hasText(host) || !StringUtils.hasText(username) || !StringUtils.hasText(password)) {
            log.warn("邮件告警已开启，但 SMTP 参数配置不全，无法发送告警邮件");
            return;
        }

        List<String> recipients = parseRecipients(settings.getAlertRecipientEmails());
        if (recipients.isEmpty()) {
            log.warn("邮件告警已开启，但未配置有效接收人邮箱，无法发送告警邮件");
            return;
        }

        int port = settings.getSmtpPort() != null ? settings.getSmtpPort() : 465;
        boolean sslEnabled = Boolean.TRUE.equals(settings.getSmtpSslEnabled());
        String from = settings.getSmtpFrom();
        String timezone = settings.getDisplayTimezone();

        // 异步派发邮件发送任务，绝不阻碍主探针循环
        mailTaskExecutor.execute(() -> {
            try {
                JavaMailSenderImpl sender = createSender(host, port, username, password, sslEnabled);
                MimeMessage message = sender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                InternetAddress fromAddress = buildFromAddress(from, username);
                helper.setFrom(fromAddress);
                helper.setTo(recipients.toArray(new String[0]));

                String subject;
                String htmlBody;

                if ("DOWN".equalsIgnoreCase(newStatus)) {
                    subject = "【🚨服务故障告警】" + project.getName() + " 访问异常 (DOWN)";
                    htmlBody = buildDowntimeEmailHtml(project, result, timezone);
                } else {
                    subject = "【✅服务恢复通知】" + project.getName() + " 已恢复正常 (UP)";
                    htmlBody = buildRecoveryEmailHtml(project, result, downtime, timezone);
                }

                helper.setSubject(subject);
                helper.setText(htmlBody, true);

                sender.send(message);
                log.info("邮件告警成功送达: 项目={}, 新状态={}, 接收人数量={}", project.getName(), newStatus, recipients.size());
            } catch (Exception e) {
                log.error("异步发送邮件告警失败: 项目=" + project.getName() + ", 原因=" + e.getMessage(), e);
            }
        });
    }

    private JavaMailSenderImpl createSender(String host, int port, String username, String password, boolean sslEnabled) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        sender.setUsername(username);
        sender.setPassword(password);
        sender.setDefaultEncoding("UTF-8");

        Properties props = sender.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.timeout", "8000");
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.writetimeout", "8000");

        if (sslEnabled) {
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            props.put("mail.smtp.socketFactory.port", String.valueOf(port));
            props.put("mail.smtp.ssl.trust", "*");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.ssl.trust", "*");
        }
        return sender;
    }

    private InternetAddress buildFromAddress(String smtpFrom, String smtpUsername) throws Exception {
        if (StringUtils.hasText(smtpFrom)) {
            if (smtpFrom.contains("<") && smtpFrom.contains(">")) {
                String personal = smtpFrom.substring(0, smtpFrom.indexOf("<")).trim();
                String email = smtpFrom.substring(smtpFrom.indexOf("<") + 1, smtpFrom.indexOf(">")).trim();
                return new InternetAddress(email, personal, "UTF-8");
            } else if (smtpFrom.contains("@")) {
                return new InternetAddress(smtpFrom, "BobAPI 监控告警", "UTF-8");
            } else {
                return new InternetAddress(smtpUsername, smtpFrom, "UTF-8");
            }
        }
        return new InternetAddress(smtpUsername, "BobAPI 监控告警", "UTF-8");
    }

    private List<String> parseRecipients(String recipientString) {
        if (!StringUtils.hasText(recipientString)) {
            return Collections.emptyList();
        }
        return Arrays.stream(recipientString.split("[,;，；]"))
                .map(String::trim)
                .filter(s -> s.contains("@"))
                .distinct()
                .collect(Collectors.toList());
    }

    private String formatDateTime(LocalDateTime timeUtc, String timezoneStr) {
        if (timeUtc == null) return "N/A";
        try {
            ZoneId targetZone = ZoneId.of(StringUtils.hasText(timezoneStr) ? timezoneStr : "Asia/Shanghai");
            ZonedDateTime zdt = timeUtc.atZone(ZoneOffset.UTC).withZoneSameInstant(targetZone);
            return zdt.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception e) {
            return timeUtc.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) + " (UTC)";
        }
    }

    private String formatDuration(Duration duration) {
        if (duration == null || duration.isNegative()) {
            return "< 1 分钟";
        }
        long seconds = duration.getSeconds();
        if (seconds == 0) {
            return "< 1 秒";
        }
        long days = seconds / 86400;
        long hours = (seconds % 86400) / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;

        StringBuilder sb = new StringBuilder();
        if (days > 0) {
            sb.append(days).append(" 天 ");
        }
        if (hours > 0) {
            sb.append(hours).append(" 小时 ");
        }
        if (minutes > 0 || hours > 0 || days > 0) {
            sb.append(minutes).append(" 分钟 ");
        }
        sb.append(secs).append(" 秒");
        return sb.toString().trim();
    }

    // ====================== HTML 现代化邮件模板 ======================

    private String buildDowntimeEmailHtml(Project project, MonitorCheckResult result, String timezone) {
        String formattedTime = formatDateTime(result.getCheckTime(), timezone);
        String httpStatus = result.getHttpStatus() != null ? String.valueOf(result.getHttpStatus()) : "无响应 / 超时";
        String latency = result.getResponseTime() != null ? result.getResponseTime() + " ms" : "超时";
        String errorSummary = StringUtils.hasText(result.getErrorSummary()) ? result.getErrorSummary() : "服务无法建立连接或响应异常";
        String errorType = StringUtils.hasText(result.getErrorType()) ? result.getErrorType() : "CONNECTION_ERROR";

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>服务故障告警</title>
            </head>
            <body style="margin: 0; padding: 24px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ef4444 0%%, #b91c1c 100%%); padding: 28px 32px; color: #ffffff;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                      <tr>
                        <td>
                          <span style="display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">● 宕机告警 (DOWN)</span>
                          <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 700; line-height: 1.3;">服务可用性探测出现异常</h1>
                          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">已完成受控二次复查确认，目标服务目前不可用</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
                      尊敬的管理员，系统在执行自动化周期巡检时，监测到以下受控服务未能通过健康检查，请尽快排查处理：
                    </div>

                    <!-- Project Info Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="font-size: 13px;">
                            <tr>
                              <td style="padding: 6px 0; color: #991b1b; width: 110px; font-weight: 600;">项目名称:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-weight: 700; font-size: 15px;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #991b1b; font-weight: 600;">访问地址:</td>
                              <td style="padding: 6px 0;"><a href="%s" target="_blank" style="color: #2563eb; text-decoration: none; word-break: break-all;">%s</a></td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #991b1b; font-weight: 600;">异常类型:</td>
                              <td style="padding: 6px 0; color: #dc2626; font-family: monospace; font-weight: 600;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #991b1b; font-weight: 600;">错误原因:</td>
                              <td style="padding: 6px 0; color: #b91c1c; font-weight: 500;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #991b1b; font-weight: 600;">HTTP 状态码:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #991b1b; font-weight: 600;">探测耗时:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #991b1b; font-weight: 600;">确认时间:</td>
                              <td style="padding: 6px 0; color: #64748b; font-family: monospace;">%s</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="text-align: center; margin-top: 24px;">
                      <a href="%s" target="_blank" style="display: inline-block; padding: 10px 24px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">直接打开故障站点</a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; text-align: center;">
                    <p style="margin: 0;">此通知由 BobAPI Control Center 自动运维监控平台发送，服务恢复后系统将自动送达恢复邮件。</p>
                    <p style="margin: 6px 0 0 0;">请勿直接回复本系统邮件。</p>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(project.getName() != null ? project.getName() : "未命名服务"),
                HtmlUtils.htmlEscape(project.getUrl() != null ? project.getUrl() : ""),
                HtmlUtils.htmlEscape(project.getUrl() != null ? project.getUrl() : ""),
                HtmlUtils.htmlEscape(errorType),
                HtmlUtils.htmlEscape(errorSummary),
                HtmlUtils.htmlEscape(httpStatus),
                HtmlUtils.htmlEscape(latency),
                HtmlUtils.htmlEscape(formattedTime),
                HtmlUtils.htmlEscape(project.getUrl() != null ? project.getUrl() : "")
        );
    }

    private String buildRecoveryEmailHtml(Project project, MonitorCheckResult result, Duration downtime, String timezone) {
        String formattedTime = formatDateTime(result.getCheckTime(), timezone);
        String formattedDowntime = formatDuration(downtime);
        String httpStatus = result.getHttpStatus() != null ? String.valueOf(result.getHttpStatus()) : "200";
        String latency = result.getResponseTime() != null ? result.getResponseTime() + " ms" : "正常";

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>服务已恢复正常</title>
            </head>
            <body style="margin: 0; padding: 24px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); padding: 28px 32px; color: #ffffff;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                      <tr>
                        <td>
                          <span style="display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">● 恢复正常 (UP)</span>
                          <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 700; line-height: 1.3;">服务已重新恢复可用</h1>
                          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">最新健康探测复核通过，所有指标恢复稳健运行</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
                      尊敬的管理员，先前出现访问异常的受控服务现已重新恢复可用：
                    </div>

                    <!-- Project Info Card -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="font-size: 13px;">
                            <tr>
                              <td style="padding: 6px 0; color: #166534; width: 110px; font-weight: 600;">项目名称:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-weight: 700; font-size: 15px;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #166534; font-weight: 600;">访问地址:</td>
                              <td style="padding: 6px 0;"><a href="%s" target="_blank" style="color: #2563eb; text-decoration: none; word-break: break-all;">%s</a></td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #166534; font-weight: 600;">故障持续时长:</td>
                              <td style="padding: 6px 0; color: #047857; font-weight: 700; font-size: 14px;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #166534; font-weight: 600;">恢复时间:</td>
                              <td style="padding: 6px 0; color: #64748b; font-family: monospace;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #166534; font-weight: 600;">当前状态码:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">HTTP %s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #166534; font-weight: 600;">当前响应耗时:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">%s</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="text-align: center; margin-top: 24px;">
                      <a href="%s" target="_blank" style="display: inline-block; padding: 10px 24px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 13px; font-weight: 600;">访问项目门户</a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; text-align: center;">
                    <p style="margin: 0;">此通知由 BobAPI Control Center 自动运维监控平台发送。</p>
                    <p style="margin: 6px 0 0 0;">请勿直接回复本系统邮件。</p>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(project.getName() != null ? project.getName() : "未命名服务"),
                HtmlUtils.htmlEscape(project.getUrl() != null ? project.getUrl() : ""),
                HtmlUtils.htmlEscape(project.getUrl() != null ? project.getUrl() : ""),
                HtmlUtils.htmlEscape(formattedDowntime),
                HtmlUtils.htmlEscape(formattedTime),
                HtmlUtils.htmlEscape(httpStatus),
                HtmlUtils.htmlEscape(latency),
                HtmlUtils.htmlEscape(project.getUrl() != null ? project.getUrl() : "")
        );
    }

    private String buildTestEmailHtml(String host, int port, String username, String recipient, String timezone) {
        String formattedTime = formatDateTime(LocalDateTime.now(ZoneOffset.UTC), timezone);

        return """
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>邮件通道连通性测试</title>
            </head>
            <body style="margin: 0; padding: 24px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
              <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%%" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #2563eb 0%%, #1d4ed8 100%%); padding: 28px 32px; color: #ffffff;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%">
                      <tr>
                        <td>
                          <span style="display: inline-block; padding: 4px 12px; background: rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase;">● 通信测试成功</span>
                          <h1 style="margin: 12px 0 0 0; font-size: 22px; font-weight: 700; line-height: 1.3;">SMTP 邮件通道测试成功</h1>
                          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">恭喜！BobAPI Control Center 邮件告警通道配置有效且畅通</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content Body -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
                      这是一封来自 <strong>BobAPI Control Center</strong> 的系统连通性测试邮件。如果您收到此邮件，说明您的 SMTP 邮件服务器参数及接收人邮箱配置完全正确，后续当监控项目发生故障宕机或恢复时，系统将通过此通道向您发送即时告警邮件。
                    </div>

                    <!-- Test Config Summary -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table border="0" cellpadding="0" cellspacing="0" width="100%%" style="font-size: 13px;">
                            <tr>
                              <td style="padding: 6px 0; color: #1e40af; width: 110px; font-weight: 600;">SMTP 服务器:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">%s:%d</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #1e40af; font-weight: 600;">发件人账号:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #1e40af; font-weight: 600;">测试接收邮箱:</td>
                              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">%s</td>
                            </tr>
                            <tr>
                              <td style="padding: 6px 0; color: #1e40af; font-weight: 600;">测试发送时间:</td>
                              <td style="padding: 6px 0; color: #64748b; font-family: monospace;">%s</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; font-size: 12px; color: #94a3b8; text-align: center;">
                    <p style="margin: 0;">BobAPI Control Center · 全方位运维监控管理系统</p>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(
                HtmlUtils.htmlEscape(host),
                port,
                HtmlUtils.htmlEscape(username),
                HtmlUtils.htmlEscape(recipient),
                HtmlUtils.htmlEscape(formattedTime)
        );
    }
}
