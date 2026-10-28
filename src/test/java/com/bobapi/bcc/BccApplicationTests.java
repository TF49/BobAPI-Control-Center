package com.bobapi.bcc;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.bobapi.bcc.common.BusinessException;
import com.bobapi.bcc.dto.SettingsDTO;
import com.bobapi.bcc.dto.TestEmailRequestDTO;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.entity.User;
import com.bobapi.bcc.mapper.ProjectMapper;
import com.bobapi.bcc.mapper.UserMapper;
import com.bobapi.bcc.monitor.UrlSafetyValidator;
import com.bobapi.bcc.service.MailNotificationService;
import com.bobapi.bcc.service.ProjectService;
import com.bobapi.bcc.service.SystemConfigService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
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

    @Autowired
    private ProjectService projectService;

    @Test
    void testContextLoadsAndSeedData() {
        // 验证用户表中存在 admin
        List<User> users = userMapper.selectList(null);
        assertFalse(users.isEmpty(), "用户表不应为空");
        User admin = users.stream().filter(u -> "admin".equals(u.getUsername())).findFirst().orElse(null);
        assertNotNull(admin, "初始管理员 admin 应当存在");
        assertTrue(passwordEncoder.matches("admin123", admin.getPasswordHash()), "初始密码 admin123 应当匹配");

        // 验证项目数与预置/新增项目
        List<Project> projects = projectMapper.selectList(null);
        assertTrue(projects.size() >= 8, "项目数应当至少为8个");
        Project invoice = projects.stream().filter(p -> "https://fp.bobdong.cn/".equals(p.getUrl())).findFirst().orElse(null);
        assertNotNull(invoice, "Invoice 发票管理系统项目应当存在");
        assertEquals("Invoice", invoice.getName());
        assertEquals("invoice", invoice.getCode());

        Project bobApi = projects.stream().filter(p -> "https://bob-api.com/".equals(p.getUrl())).findFirst().orElse(null);
        assertNotNull(bobApi, "Bob API 项目应当存在");
        assertEquals("Bob API", bobApi.getName());
        assertEquals("bob-api", bobApi.getCode());

        Project dongToken = projects.stream().filter(p -> "https://dongtoken.com/".equals(p.getUrl())).findFirst().orElse(null);
        assertNotNull(dongToken, "DongToken 项目应当存在");
        assertEquals("DongToken", dongToken.getName());
        assertEquals("dongtoken", dongToken.getCode());
    }

    @Test
    void testUrlSafetyValidator() {
        // 白名单测试 (bob-api.com、bobdong.cn 及 dongtoken.com)
        assertDoesNotThrow(() -> urlSafetyValidator.validateUrl("https://fp.bobdong.cn/"));
        assertDoesNotThrow(() -> urlSafetyValidator.validateUrl("https://vpn.bob-api.com/"));
        assertDoesNotThrow(() -> urlSafetyValidator.validateUrl("https://bob-api.com/"));
        assertDoesNotThrow(() -> urlSafetyValidator.validateUrl("https://dongtoken.com/"));
        assertDoesNotThrow(() -> urlSafetyValidator.validateUrl("https://api.dongtoken.com/"));

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

    @Test
    void testProjectPageSorting() {
        // ID 升序
        Page<Project> pageIdAsc = projectService.getProjectPage(1, 10, null, null, null, null, "id", "asc");
        List<Project> recordsIdAsc = pageIdAsc.getRecords();
        assertTrue(recordsIdAsc.size() >= 2);
        for (int i = 0; i < recordsIdAsc.size() - 1; i++) {
            assertTrue(recordsIdAsc.get(i).getId() <= recordsIdAsc.get(i + 1).getId(), "ID应当升序排列");
        }

        // ID 降序
        Page<Project> pageIdDesc = projectService.getProjectPage(1, 10, null, null, null, null, "id", "desc");
        List<Project> recordsIdDesc = pageIdDesc.getRecords();
        assertTrue(recordsIdDesc.size() >= 2);
        for (int i = 0; i < recordsIdDesc.size() - 1; i++) {
            assertTrue(recordsIdDesc.get(i).getId() >= recordsIdDesc.get(i + 1).getId(), "ID应当降序排列");
        }

        // 创建时间 降序
        Page<Project> pageCreatedAtDesc = projectService.getProjectPage(1, 10, null, null, null, null, "createdAt", "desc");
        List<Project> recordsCreatedDesc = pageCreatedAtDesc.getRecords();
        assertTrue(recordsCreatedDesc.size() >= 2);
        for (int i = 0; i < recordsCreatedDesc.size() - 1; i++) {
            LocalDateTime t1 = recordsCreatedDesc.get(i).getCreatedAt();
            LocalDateTime t2 = recordsCreatedDesc.get(i + 1).getCreatedAt();
            if (t1 != null && t2 != null) {
                assertTrue(!t1.isBefore(t2), "创建时间应当降序排列");
            }
        }
    }
}
