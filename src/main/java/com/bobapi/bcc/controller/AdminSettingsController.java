package com.bobapi.bcc.controller;

import com.bobapi.bcc.common.Result;
import com.bobapi.bcc.dto.SettingsDTO;
import com.bobapi.bcc.dto.TestEmailRequestDTO;
import com.bobapi.bcc.service.MailNotificationService;
import com.bobapi.bcc.service.SystemConfigService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/settings")
public class AdminSettingsController {

    private final SystemConfigService configService;
    private final MailNotificationService mailNotificationService;

    public AdminSettingsController(SystemConfigService configService,
                                   MailNotificationService mailNotificationService) {
        this.configService = configService;
        this.mailNotificationService = mailNotificationService;
    }

    @GetMapping
    public Result<SettingsDTO> getSettings() {
        return Result.success(configService.getSettings());
    }

    @PutMapping
    public Result<Void> updateSettings(@Valid @RequestBody SettingsDTO dto) {
        configService.updateSettings(dto);
        return Result.success();
    }

    @PostMapping("/email/test")
    public Result<Void> sendTestEmail(@RequestBody(required = false) TestEmailRequestDTO testRequest) {
        if (testRequest == null) {
            testRequest = new TestEmailRequestDTO();
        }
        mailNotificationService.sendTestEmail(testRequest);
        return Result.success();
    }
}
