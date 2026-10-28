package com.bobapi.bcc.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.bobapi.bcc.dto.SettingsDTO;
import com.bobapi.bcc.entity.SystemConfig;
import com.bobapi.bcc.mapper.SystemConfigMapper;
import com.bobapi.bcc.service.SystemConfigService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SystemConfigServiceImpl implements SystemConfigService {

    private final SystemConfigMapper configMapper;

    public SystemConfigServiceImpl(SystemConfigMapper configMapper) {
        this.configMapper = configMapper;
    }

    @Override
    public SettingsDTO getSettings() {
        Map<String, String> map = loadConfigMap();
        SettingsDTO dto = buildSettingsFromMap(map);
        // 对外输出脱敏 SMTP 密码
        if (StringUtils.hasText(dto.getSmtpPassword())) {
            dto.setSmtpPassword("******");
        }
        return dto;
    }

    @Override
    public SettingsDTO getRawSettings() {
        Map<String, String> map = loadConfigMap();
        return buildSettingsFromMap(map);
    }

    @Override
    public String getConfigValue(String key) {
        SystemConfig config = configMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key));
        return config != null ? config.getConfigValue() : null;
    }

    @Override
    public void updateSettings(SettingsDTO dto) {
        if (dto.getDefaultCheckInterval() != null) {
            upsert("default_check_interval", String.valueOf(dto.getDefaultCheckInterval()));
        }
        if (dto.getDefaultTimeoutSeconds() != null) {
            upsert("default_timeout_seconds", String.valueOf(dto.getDefaultTimeoutSeconds()));
        }
        if (dto.getRetryOnFailure() != null) {
            upsert("retry_on_failure", String.valueOf(dto.getRetryOnFailure()));
        }
        if (dto.getPublicRefreshInterval() != null) {
            upsert("public_refresh_interval", String.valueOf(dto.getPublicRefreshInterval()));
        }
        if (dto.getHistoryRetentionDays() != null) {
            upsert("history_retention_days", String.valueOf(dto.getHistoryRetentionDays()));
        }
        if (StringUtils.hasText(dto.getDisplayTimezone())) {
            upsert("display_timezone", dto.getDisplayTimezone().trim());
        }

        // 邮件告警配置
        if (dto.getEmailAlertEnabled() != null) {
            upsert("email_alert_enabled", String.valueOf(dto.getEmailAlertEnabled()));
        }
        if (dto.getSmtpHost() != null) {
            upsert("smtp_host", dto.getSmtpHost().trim());
        }
        if (dto.getSmtpPort() != null) {
            upsert("smtp_port", String.valueOf(dto.getSmtpPort()));
        }
        if (dto.getSmtpUsername() != null) {
            upsert("smtp_username", dto.getSmtpUsername().trim());
        }
        // 若提交的是 "******" 或空则保持原密码不变，只有提交新密码时才更新
        if (StringUtils.hasText(dto.getSmtpPassword()) && !"******".equals(dto.getSmtpPassword().trim())) {
            upsert("smtp_password", dto.getSmtpPassword().trim());
        }
        if (dto.getSmtpSslEnabled() != null) {
            upsert("smtp_ssl_enabled", String.valueOf(dto.getSmtpSslEnabled()));
        }
        if (dto.getSmtpFrom() != null) {
            upsert("smtp_from", dto.getSmtpFrom().trim());
        }
        if (dto.getAlertRecipientEmails() != null) {
            upsert("alert_recipient_emails", dto.getAlertRecipientEmails().trim());
        }
    }

    private Map<String, String> loadConfigMap() {
        List<SystemConfig> list = configMapper.selectList(null);
        Map<String, String> map = new HashMap<>();
        for (SystemConfig sc : list) {
            map.put(sc.getConfigKey(), sc.getConfigValue());
        }
        return map;
    }

    private SettingsDTO buildSettingsFromMap(Map<String, String> map) {
        return SettingsDTO.builder()
                .defaultCheckInterval(getInt(map, "default_check_interval", 600))
                .defaultTimeoutSeconds(getInt(map, "default_timeout_seconds", 10))
                .retryOnFailure(Boolean.parseBoolean(map.getOrDefault("retry_on_failure", "true")))
                .publicRefreshInterval(getInt(map, "public_refresh_interval", 30))
                .historyRetentionDays(getInt(map, "history_retention_days", 30))
                .displayTimezone(map.getOrDefault("display_timezone", "Asia/Shanghai"))
                .emailAlertEnabled(Boolean.parseBoolean(map.getOrDefault("email_alert_enabled", "false")))
                .smtpHost(map.getOrDefault("smtp_host", ""))
                .smtpPort(getInt(map, "smtp_port", 465))
                .smtpUsername(map.getOrDefault("smtp_username", ""))
                .smtpPassword(map.getOrDefault("smtp_password", ""))
                .smtpSslEnabled(Boolean.parseBoolean(map.getOrDefault("smtp_ssl_enabled", "true")))
                .smtpFrom(map.getOrDefault("smtp_from", ""))
                .alertRecipientEmails(map.getOrDefault("alert_recipient_emails", ""))
                .build();
    }

    private void upsert(String key, String value) {
        SystemConfig existing = configMapper.selectOne(new LambdaQueryWrapper<SystemConfig>()
                .eq(SystemConfig::getConfigKey, key));
        if (existing != null) {
            existing.setConfigValue(value);
            configMapper.updateById(existing);
        } else {
            SystemConfig config = new SystemConfig();
            config.setConfigKey(key);
            config.setConfigValue(value);
            configMapper.insert(config);
        }
    }

    private int getInt(Map<String, String> map, String key, int defaultVal) {
        try {
            return Integer.parseInt(map.getOrDefault(key, String.valueOf(defaultVal)));
        } catch (Exception e) {
            return defaultVal;
        }
    }
}
