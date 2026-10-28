package com.bobapi.bcc.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.bobapi.bcc.common.Result;
import com.bobapi.bcc.dto.DashboardSummaryDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.service.MonitorService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminMonitorController {

    private final MonitorService monitorService;

    public AdminMonitorController(MonitorService monitorService) {
        this.monitorService = monitorService;
    }

    @GetMapping("/dashboard/summary")
    public Result<DashboardSummaryDTO> getDashboardSummary() {
        return Result.success(monitorService.getDashboardSummary());
    }

    @GetMapping("/monitor/history")
    public Result<Page<MonitorCheckResult>> getHistoryPage(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "15") int size,
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) Boolean isSuccess,
            @RequestParam(required = false) Integer httpStatus,
            @RequestParam(required = false) String errorType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {
        return Result.success(monitorService.getHistoryPage(page, size, projectId, isSuccess, httpStatus, errorType, startTime, endTime));
    }

    @GetMapping("/monitor/projects/{id}/history")
    public Result<Page<MonitorCheckResult>> getProjectHistoryPage(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "15") int size) {
        return Result.success(monitorService.getHistoryPage(page, size, id, null, null, null, null, null));
    }

    @GetMapping("/monitor/projects/{id}/stats")
    public Result<Map<String, Object>> getProjectStats(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int days) {
        return Result.success(monitorService.getProjectStats(id, days));
    }

    @GetMapping("/monitor/projects/{id}/trend")
    public Result<List<Map<String, Object>>> getProjectTrend(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int days) {
        return Result.success(monitorService.getProjectTrend(id, days));
    }

    @GetMapping("/monitor/summary")
    public Result<List<Map<String, Object>>> getGlobalTrend(@RequestParam(defaultValue = "1") int days) {
        return Result.success(monitorService.getGlobalTrend(days));
    }
}
