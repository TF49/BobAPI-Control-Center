package com.bobapi.bcc.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.bobapi.bcc.dto.DashboardSummaryDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.mapper.MonitorCheckResultMapper;
import com.bobapi.bcc.mapper.ProjectMapper;
import com.bobapi.bcc.service.MonitorService;
import com.bobapi.bcc.service.SystemConfigService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MonitorServiceImpl implements MonitorService {

    private final ProjectMapper projectMapper;
    private final MonitorCheckResultMapper resultMapper;
    private final SystemConfigService configService;

    public MonitorServiceImpl(ProjectMapper projectMapper,
                              MonitorCheckResultMapper resultMapper,
                              SystemConfigService configService) {
        this.projectMapper = projectMapper;
        this.resultMapper = resultMapper;
        this.configService = configService;
    }

    @Override
    public DashboardSummaryDTO getDashboardSummary() {
        List<Project> allProjects = projectMapper.selectList(null);
        int total = allProjects.size();
        int online = (int) allProjects.stream().filter(p -> "UP".equalsIgnoreCase(p.getCurrentStatus())).count();
        int offline = (int) allProjects.stream().filter(p -> "DOWN".equalsIgnoreCase(p.getCurrentStatus())).count();
        int unknown = total - online - offline;

        // 直接通过数据库底层聚合计算 24 小时内有效成功检查的真实加权平均延迟，消除小时平均加和偏差
        LocalDateTime since24h = LocalDateTime.now(ZoneOffset.UTC).minusHours(24);
        Double avg = resultMapper.calculateGlobalAvgLatency(since24h);
        long avgLatency = (avg != null) ? Math.round(avg) : 0;

        // 最近一次检查时间
        LocalDateTime lastCheckTime = allProjects.stream()
                .map(Project::getLastCheckTime)
                .filter(t -> t != null)
                .max(LocalDateTime::compareTo)
                .orElse(null);

        return DashboardSummaryDTO.builder()
                .totalProjects(total)
                .onlineProjects(online)
                .offlineProjects(offline)
                .unknownProjects(unknown)
                .avgResponseTime(avgLatency)
                .lastCheckTime(lastCheckTime)
                .build();
    }

    @Override
    public Page<MonitorCheckResult> getHistoryPage(int page, int size, Long projectId, Boolean isSuccess, Integer httpStatus, String errorType, LocalDateTime startTime, LocalDateTime endTime) {
        return getHistoryPage(page, size, projectId, isSuccess, httpStatus, errorType, startTime, endTime, null, null);
    }

    @Override
    public Page<MonitorCheckResult> getHistoryPage(int page, int size, Long projectId, Boolean isSuccess, Integer httpStatus, String errorType, LocalDateTime startTime, LocalDateTime endTime, String sortBy, String sortOrder) {
        Page<MonitorCheckResult> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<MonitorCheckResult> wrapper = new LambdaQueryWrapper<>();

        if (projectId != null) {
            wrapper.eq(MonitorCheckResult::getProjectId, projectId);
        }
        if (isSuccess != null) {
            wrapper.eq(MonitorCheckResult::getIsSuccess, isSuccess);
        }
        if (httpStatus != null) {
            wrapper.eq(MonitorCheckResult::getHttpStatus, httpStatus);
        }
        if (StringUtils.hasText(errorType)) {
            wrapper.eq(MonitorCheckResult::getErrorType, errorType);
        }
        if (startTime != null) {
            wrapper.ge(MonitorCheckResult::getCheckTime, startTime);
        }
        if (endTime != null) {
            wrapper.le(MonitorCheckResult::getCheckTime, endTime);
        }

        boolean isAsc = "asc".equalsIgnoreCase(sortOrder);
        if ("id".equalsIgnoreCase(sortBy)) {
            if (isAsc) {
                wrapper.orderByAsc(MonitorCheckResult::getId);
            } else {
                wrapper.orderByDesc(MonitorCheckResult::getId);
            }
        } else if ("checkTime".equalsIgnoreCase(sortBy) || "createdAt".equalsIgnoreCase(sortBy) || "created_at".equalsIgnoreCase(sortBy)) {
            if (isAsc) {
                wrapper.orderByAsc(MonitorCheckResult::getCheckTime);
            } else {
                wrapper.orderByDesc(MonitorCheckResult::getCheckTime);
            }
        } else {
            wrapper.orderByDesc(MonitorCheckResult::getCheckTime);
        }

        return resultMapper.selectPage(pageParam, wrapper);
    }

    @Override
    public Map<String, Object> getProjectStats(Long projectId, int days) {
        LocalDateTime since = LocalDateTime.now(ZoneOffset.UTC).minusDays(days);
        Map<String, Object> raw = resultMapper.calculateProjectStats(projectId, since);

        long total = (raw != null && raw.get("totalChecks") != null) ? ((Number) raw.get("totalChecks")).longValue() : 0;
        long success = (raw != null && raw.get("successChecks") != null) ? ((Number) raw.get("successChecks")).longValue() : 0;
        double avgLatency = (raw != null && raw.get("avgLatency") != null) ? ((Number) raw.get("avgLatency")).doubleValue() : 0.0;

        double uptime = 0.0;
        if (total > 0) {
            uptime = Math.round((double) success / total * 10000.0) / 100.0; // 保留两位小数
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalChecks", total);
        stats.put("successChecks", success);
        stats.put("uptime", uptime);
        stats.put("avgLatency", Math.round(avgLatency));
        return stats;
    }

    @Override
    public List<Map<String, Object>> getProjectTrend(Long projectId, int days) {
        LocalDateTime since = LocalDateTime.now(ZoneOffset.UTC).minusDays(days);
        List<Map<String, Object>> rawList = resultMapper.queryHourlyTrend(projectId, since, getTimeZoneOffset());
        return formatTrendRows(rawList);
    }

    @Override
    public List<Map<String, Object>> getGlobalTrend(int days) {
        LocalDateTime since = LocalDateTime.now(ZoneOffset.UTC).minusDays(days);
        List<Map<String, Object>> rawList = resultMapper.queryGlobalHourlyTrend(since, getTimeZoneOffset());
        return formatTrendRows(rawList);
    }

    private String getTimeZoneOffset() {
        try {
            String tz = configService.getSettings().getDisplayTimezone();
            ZoneId zoneId = ZoneId.of(StringUtils.hasText(tz) ? tz : "Asia/Shanghai");
            return zoneId.getRules().getOffset(Instant.now()).getId();
        } catch (Exception e) {
            return "+08:00";
        }
    }

    private List<Map<String, Object>> formatTrendRows(List<Map<String, Object>> rawList) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (rawList == null) return result;

        for (Map<String, Object> row : rawList) {
            long total = (row.get("totalChecks") != null) ? ((Number) row.get("totalChecks")).longValue() : 0;
            long success = (row.get("successChecks") != null) ? ((Number) row.get("successChecks")).longValue() : 0;
            double avgLat = (row.get("avgLatency") != null) ? ((Number) row.get("avgLatency")).doubleValue() : 0.0;

            double uptime = total > 0 ? (Math.round((double) success / total * 10000.0) / 100.0) : 0.0;

            Map<String, Object> item = new HashMap<>();
            item.put("time", row.get("timeHour"));
            item.put("uptime", uptime);
            item.put("latency", Math.round(avgLat));
            result.add(item);
        }
        return result;
    }
}
