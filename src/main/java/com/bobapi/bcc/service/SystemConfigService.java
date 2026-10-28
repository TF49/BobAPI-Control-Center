package com.bobapi.bcc.service;

import com.bobapi.bcc.dto.SettingsDTO;

public interface SystemConfigService {
    SettingsDTO getSettings();
    SettingsDTO getRawSettings();
    void updateSettings(SettingsDTO dto);
    String getConfigValue(String key);
}
