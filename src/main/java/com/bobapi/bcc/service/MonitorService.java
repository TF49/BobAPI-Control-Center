package com.bobapi.bcc.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.bobapi.bcc.dto.DashboardSummaryDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface MonitorService {
    DashboardSummaryDTO getDashboardSummary();
    Page<MonitorCheckResult> getHistoryPage(int page, int size, Long projectId, Boolean isSuccess, Integer httpStatus, String errorType, LocalDateTime startTime, LocalDateTime endTime);
    Map<String, Object> getProjectStats(Long projectId, int days);
    List<Map<String, Object>> getProjectTrend(Long projectId, int days);
    List<Map<String, Object>> getGlobalTrend(int days);
}
