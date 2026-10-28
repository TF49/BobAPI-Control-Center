package com.bobapi.bcc;

import com.bobapi.bcc.common.BusinessException;
import com.bobapi.bcc.dto.SettingsDTO;
import com.bobapi.bcc.dto.TestEmailRequestDTO;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.entity.User;
import com.bobapi.bcc.mapper.ProjectMapper;
import com.bobapi.bcc.mapper.UserMapper;
import com.bobapi.bcc.monitor.UrlSafetyValidator;
import com.bobapi.bcc.service.MailNotificationService;
import com.bobapi.bcc.service.SystemConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class BccApplicationTests {

    @Autowired
    private ProjectMapper projectMapper;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UrlSafetyValidator urlSafetyValidator;

    @Autowired
    private SystemConfigService systemConfigService;

    @Autowired
    private MailNotificationService mailNotificationService;

    @Test
    void testContextLoadsAndSeedData() {
        // 验证用户表中存在 admin
        List<User> users = userMapper.selectList(null);
        assertFalse(users.isEmpty(), "用户表不应为空");
        User admin = users.stream().filter(u -> "admin".equals(u.getUsername())).findFirst().orElse(null);
        assertNotNull(admin, "初始管理员 admin 应当存在");
        assertTrue(passwordEncoder.matches("admin123", admin.getPasswordHash()), "初始密码 admin123 应当匹配");

        // 验证项目数与新增的发票系统项目
        List<Project> projects = projectMapper.selectList(null);
        assertTrue(projects.size() >= 6, "项目数应当至少为6个");
        Project invoice = projects.stream().filter(p -> "https://fp.bobdong.cn/".equals(p.getUrl())).findFirst().orElse(null);
        assertNotNull(invoice, "Invoice 发票管理系统项目应当存在");
        assertEquals("Invoice", invoice.getName());
        assertEquals("invoice", invoice.getCode());
    }

    @Test
    void testUrlSafetyValidator() {
        // 白名单测试 (bob-api.com 及 bobdong.cn)
        assertDoesNotThrow(() -> urlSafetyValidator.validateUrl("https://fp.bobdong.cn/"));
        assertDoesNotThrow(() -> urlSafetyValidator.validateUrl("https://vpn.bob-api.com/"));

        // 非法协议测试
        assertThrows(BusinessException.class, () -> urlSafetyValidator.validateUrl("http://fp.bobdong.cn/"));

        // 未授权域名测试
        assertThrows(BusinessException.class, () -> urlSafetyValidator.validateUrl("https://evil.com/"));
    }

    @Test
    void testEmailSettingsAndValidation() {
        // 读取配置
        SettingsDTO settings = systemConfigService.getSettings();
        assertNotNull(settings);

        // 修改邮件配置
        settings.setEmailAlertEnabled(true);
        settings.setSmtpHost("smtp.example.com");
        settings.setSmtpPort(465);
        settings.setSmtpUsername("monitor@example.com");
        settings.setSmtpPassword("secretPassword123");
        settings.setAlertRecipientEmails("admin@example.com,ops@example.com");
        systemConfigService.updateSettings(settings);

        // 验证对外输出已脱敏
        SettingsDTO masked = systemConfigService.getSettings();
        assertEquals("******", masked.getSmtpPassword());
        assertEquals("smtp.example.com", masked.getSmtpHost());
        assertTrue(masked.getEmailAlertEnabled());

        // 验证内部保留真实密码
        SettingsDTO raw = systemConfigService.getRawSettings();
        assertEquals("secretPassword123", raw.getSmtpPassword());

        // 测试邮件参数校验（如果缺少接收人或参数异常，应抛出 BusinessException）
        TestEmailRequestDTO invalidReq = new TestEmailRequestDTO();
        invalidReq.setSmtpHost("");
        assertThrows(BusinessException.class, () -> mailNotificationService.sendTestEmail(invalidReq));
    }
}
