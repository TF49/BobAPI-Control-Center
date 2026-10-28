package com.bobapi.bcc.monitor;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.mapper.MonitorCheckResultMapper;
import com.bobapi.bcc.mapper.ProjectMapper;
import com.bobapi.bcc.service.SystemConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;

@Slf4j
@Component
public class MonitorScheduler {

    private final ProjectMapper projectMapper;
    private final MonitorExecutor monitorExecutor;
    private final Executor monitorTaskExecutor;
    private final SystemConfigService configService;
    private final MonitorCheckResultMapper resultMapper;

    /**
     * 正在执行检查中的项目 ID 集合，杜绝多周期并发重叠探测
     */
    private final Set<Long> inProgressProjects = ConcurrentHashMap.newKeySet();

    public MonitorScheduler(ProjectMapper projectMapper,
                            MonitorExecutor monitorExecutor,
                            @Qualifier("monitorTaskExecutor") Executor monitorTaskExecutor,
                            SystemConfigService configService,
                            MonitorCheckResultMapper resultMapper) {
        this.projectMapper = projectMapper;
        this.monitorExecutor = monitorExecutor;
        this.monitorTaskExecutor = monitorTaskExecutor;
        this.configService = configService;
        this.resultMapper = resultMapper;
    }

    /**
     * 服务启动后执行首次全量健康检查，并清理一次过期历史记录
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("BCC 启动完成，开始执行初始监控检查与历史维护...");
        monitorTaskExecutor.execute(() -> {
            try {
                Thread.sleep(3000); // 延迟 3 秒等待数据源及就绪探测完全稳定
                triggerAllChecks();
                cleanExpiredHistory();
            } catch (Exception e) {
                log.error("初始监控检查与维护异常: ", e);
            }
        });
    }

    /**
     * 心跳扫描调度器：每 15 秒扫描一次数据库，根据每个项目配置的检查周期动态调度检查任务。
     * 默认项目间隔为 600 秒 (10 分钟)，若管理员修改了全局或项目检查间隔，无需重启即可自适应生效。
     */
    @Scheduled(fixedDelay = 15000, initialDelay = 15000)
    public void schedulePeriodicChecks() {
        int defaultInterval = 600;
        try {
            defaultInterval = configService.getSettings().getDefaultCheckInterval();
        } catch (Exception ignored) {
        }

        List<Project> projects = projectMapper.selectList(new LambdaQueryWrapper<Project>()
                .eq(Project::getIsEnabled, true)
                .eq(Project::getIsMonitorEnabled, true));

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

        for (Project project : projects) {
            int interval = (project.getCheckInterval() != null && project.getCheckInterval() > 0)
                    ? project.getCheckInterval() : defaultInterval;

            boolean needCheck = false;
            if (project.getLastCheckTime() == null) {
                needCheck = true;
            } else {
                long elapsed = Duration.between(project.getLastCheckTime(), now).getSeconds();
                if (elapsed >= interval) {
                    needCheck = true;
                }
            }

            if (needCheck && inProgressProjects.add(project.getId())) {
                monitorTaskExecutor.execute(() -> {
                    try {
                        monitorExecutor.executeCheck(project, "SCHEDULE");
                    } catch (Exception e) {
                        log.error("定时监控项目 [{}] 检查异常: ", project.getName(), e);
                    } finally {
                        inProgressProjects.remove(project.getId());
                    }
                });
            }
        }
    }

    /**
     * 立即触发所有已启用监控项目的全量检查
     */
    public void triggerAllChecks() {
        List<Project> projects = projectMapper.selectList(new LambdaQueryWrapper<Project>()
                .eq(Project::getIsEnabled, true)
                .eq(Project::getIsMonitorEnabled, true));

        for (Project project : projects) {
            if (inProgressProjects.add(project.getId())) {
                monitorTaskExecutor.execute(() -> {
                    try {
                        monitorExecutor.executeCheck(project, "SCHEDULE");
                    } catch (Exception e) {
                        log.error("全量监控项目 [{}] 检查异常: ", project.getName(), e);
                    } finally {
                        inProgressProjects.remove(project.getId());
                    }
                });
            }
        }
    }

    /**
     * 每日凌晨 3:00 自动清理过期历史记录
     */
    @Scheduled(cron = "0 0 3 * * ?")
    public void cleanExpiredHistory() {
        try {
            int retentionDays = configService.getSettings().getHistoryRetentionDays();
            if (retentionDays > 0) {
                LocalDateTime expireTime = LocalDateTime.now(ZoneOffset.UTC).minusDays(retentionDays);
                int deleted = resultMapper.delete(new LambdaQueryWrapper<MonitorCheckResult>()
                        .lt(MonitorCheckResult::getCheckTime, expireTime));
                log.info("定时清理过期监控日志完成: 保留天数={}天, 清理记录数={}", retentionDays, deleted);
            }
        } catch (Exception e) {
            log.error("清理过期监控日志异常: ", e);
        }
    }
}
