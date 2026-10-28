package com.bobapi.bcc.monitor;

import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.mapper.MonitorCheckResultMapper;
import com.bobapi.bcc.mapper.ProjectMapper;
import com.bobapi.bcc.service.MailNotificationService;
import com.bobapi.bcc.service.SystemConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.net.ssl.SSLHandshakeException;
import java.net.ConnectException;
import java.net.URI;
import java.net.UnknownHostException;
import java.net.http.HttpClient;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Slf4j
@Component
public class MonitorExecutor {

    private final ProjectMapper projectMapper;
    private final MonitorCheckResultMapper resultMapper;
    private final UrlSafetyValidator safetyValidator;
    private final SystemConfigService configService;
    private final MailNotificationService mailNotificationService;
    private final HttpClient httpClient;

    public MonitorExecutor(ProjectMapper projectMapper,
                           MonitorCheckResultMapper resultMapper,
                           UrlSafetyValidator safetyValidator,
                           SystemConfigService configService,
                           MailNotificationService mailNotificationService) {
        this.projectMapper = projectMapper;
        this.resultMapper = resultMapper;
        this.safetyValidator = safetyValidator;
        this.configService = configService;
        this.mailNotificationService = mailNotificationService;
        this.httpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * 执行单次项目健康检查，包含受控复查机制
     */
    public MonitorCheckResult executeCheck(Project project, String triggerType) {
        LocalDateTime checkTime = LocalDateTime.now(ZoneOffset.UTC);
        int defaultTimeout = 10;
        try {
            defaultTimeout = configService.getSettings().getDefaultTimeoutSeconds();
        } catch (Exception ignored) {
        }
        int timeoutSeconds = (project.getTimeoutSeconds() != null && project.getTimeoutSeconds() > 0)
                ? project.getTimeoutSeconds() : defaultTimeout;

        // 首次检查
        SingleCheckAttempt attempt = doSingleAttempt(project.getUrl(), timeoutSeconds, project.getExpectedStatusCode());

        // 检查系统全局受控复查开关配置
        boolean retryEnabled = true;
        try {
            retryEnabled = configService.getSettings().getRetryOnFailure();
        } catch (Exception ignored) {
        }

        // 如果首检失败且启用了受控复查，执行一次受控复查（重试）以防止瞬时网络抖动误判
        int retryCount = 0;
        if (!attempt.isSuccess && retryEnabled) {
            try {
                Thread.sleep(1000); // 间隔 1 秒复查
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            SingleCheckAttempt retryAttempt = doSingleAttempt(project.getUrl(), timeoutSeconds, project.getExpectedStatusCode());
            retryCount = 1;
            // 以复查结果作为最终判定
            attempt = retryAttempt;
        }

        LocalDateTime endTime = LocalDateTime.now(ZoneOffset.UTC);

        // 构造检查结果实体
        MonitorCheckResult result = new MonitorCheckResult();
        result.setProjectId(project.getId());
        result.setCheckTime(checkTime);
        result.setEndTime(endTime);
        result.setIsSuccess(attempt.isSuccess);
        result.setHttpStatus(attempt.httpStatus);
        result.setResponseTime(attempt.responseTime);
        result.setErrorType(attempt.errorType);
        result.setErrorSummary(attempt.errorSummary);
        result.setRetryCount(retryCount);
        result.setTriggerType(triggerType);
        resultMapper.insert(result);

        // 计算状态流转与停机时长
        String oldStatus = project.getCurrentStatus() != null ? project.getCurrentStatus() : "UNKNOWN";
        String newStatus = attempt.isSuccess ? "UP" : "DOWN";
        Duration downtime = null;

        boolean statusChanged = !newStatus.equalsIgnoreCase(oldStatus);
        if (statusChanged) {
            LocalDateTime previousChangeTime = project.getStatusChangedAt();
            if ("UP".equalsIgnoreCase(newStatus) && "DOWN".equalsIgnoreCase(oldStatus)) {
                // 恢复场景：计算宕机时长
                if (previousChangeTime != null) {
                    downtime = Duration.between(previousChangeTime, checkTime);
                } else if (project.getLastCheckTime() != null) {
                    downtime = Duration.between(project.getLastCheckTime(), checkTime);
                }
                if (downtime != null && downtime.isNegative()) {
                    downtime = Duration.ZERO;
                }
            }
            project.setStatusChangedAt(checkTime);
        } else if (project.getStatusChangedAt() == null) {
            // 兜底：为历史未记录变更时间的项目初始化时间戳
            project.setStatusChangedAt(checkTime);
        }

        // 更新项目表状态
        project.setLastCheckTime(checkTime);
        project.setLastResponseTime(attempt.responseTime);
        project.setLastCheckStatus(attempt.isSuccess ? "UP" : "DOWN");
        project.setCurrentStatus(newStatus);
        projectMapper.updateById(project);

        // 如果状态发生流转，且属于 (UP -> DOWN) 故障 或 (DOWN -> UP) 恢复，触发邮件告警
        if (statusChanged) {
            if ("DOWN".equalsIgnoreCase(newStatus) && ("UP".equalsIgnoreCase(oldStatus) || "UNKNOWN".equalsIgnoreCase(oldStatus))) {
                mailNotificationService.sendAlertNotification(project, result, oldStatus, newStatus, null);
            } else if ("UP".equalsIgnoreCase(newStatus) && "DOWN".equalsIgnoreCase(oldStatus)) {
                mailNotificationService.sendAlertNotification(project, result, oldStatus, newStatus, downtime);
            }
        }

        return result;
    }

    private SingleCheckAttempt doSingleAttempt(String urlString, int timeoutSeconds, String expectedRange) {
        SingleCheckAttempt attempt = new SingleCheckAttempt();
        long startNano = System.nanoTime();

        try {
            // URL 格式与 SSRF 阻断
            safetyValidator.validateUrl(urlString);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(urlString))
                    .timeout(Duration.ofSeconds(timeoutSeconds))
                    .header("User-Agent", "BobAPI-Control-Center-HealthChecker/1.0")
                    .GET()
                    .build();

            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            long latency = (System.nanoTime() - startNano) / 1_000_000;
            attempt.responseTime = latency;
            attempt.httpStatus = response.statusCode();

            // 状态码校验 (如 200-299)
            if (isStatusExpected(response.statusCode(), expectedRange)) {
                attempt.isSuccess = true;
            } else {
                attempt.isSuccess = false;
                attempt.errorType = "HTTP_STATUS_ERROR";
                attempt.errorSummary = "HTTP 状态码异常: " + response.statusCode();
            }
        } catch (HttpTimeoutException e) {
            attempt.isSuccess = false;
            attempt.errorType = "TIMEOUT";
            attempt.errorSummary = "请求响应超时(>" + timeoutSeconds + "s)";
            attempt.responseTime = (System.nanoTime() - startNano) / 1_000_000;
        } catch (UnknownHostException e) {
            attempt.isSuccess = false;
            attempt.errorType = "DNS_FAILURE";
            attempt.errorSummary = "域名解析失败";
            attempt.responseTime = (System.nanoTime() - startNano) / 1_000_000;
        } catch (SSLHandshakeException e) {
            attempt.isSuccess = false;
            attempt.errorType = "SSL_ERROR";
            attempt.errorSummary = "TLS/SSL 证书握手失败";
            attempt.responseTime = (System.nanoTime() - startNano) / 1_000_000;
        } catch (ConnectException e) {
            attempt.isSuccess = false;
            attempt.errorType = "CONNECTION_REFUSED";
            attempt.errorSummary = "连接拒绝或端口不可达";
            attempt.responseTime = (System.nanoTime() - startNano) / 1_000_000;
        } catch (Exception e) {
            attempt.isSuccess = false;
            attempt.errorType = "OTHER";
            String msg = e.getMessage();
            attempt.errorSummary = (msg != null && msg.length() > 200) ? msg.substring(0, 200) : msg;
            attempt.responseTime = (System.nanoTime() - startNano) / 1_000_000;
        }

        return attempt;
    }

    private boolean isStatusExpected(int status, String expectedRange) {
        if (expectedRange == null || expectedRange.isBlank()) {
            return status >= 200 && status < 300;
        }
        if (expectedRange.contains("-")) {
            String[] parts = expectedRange.split("-");
            try {
                int min = Integer.parseInt(parts[0].trim());
                int max = Integer.parseInt(parts[1].trim());
                return status >= min && status <= max;
            } catch (Exception ignored) {
            }
        }
        return status >= 200 && status < 300;
    }

    private static class SingleCheckAttempt {
        boolean isSuccess;
        Integer httpStatus;
        long responseTime;
        String errorType;
        String errorSummary;
    }
}
