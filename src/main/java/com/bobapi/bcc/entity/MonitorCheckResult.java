package com.bobapi.bcc.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("monitor_check_result")
public class MonitorCheckResult implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long projectId;
    private LocalDateTime checkTime;
    private LocalDateTime endTime;
    private Boolean isSuccess;
    private Integer httpStatus;
    private Long responseTime;
    private String errorType;
    private String errorSummary;
    private Integer retryCount;
    private String triggerType; // SCHEDULE, MANUAL
    private LocalDateTime createdAt;
}
