package com.bobapi.bcc.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DashboardSummaryDTO {
    private int totalProjects;
    private int onlineProjects;
    private int offlineProjects;
    private int unknownProjects;
    private long avgResponseTime;
    private LocalDateTime lastCheckTime;
}
