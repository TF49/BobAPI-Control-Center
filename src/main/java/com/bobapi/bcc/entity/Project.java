package com.bobapi.bcc.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serializable;
import java.time.LocalDateTime;

@Data
@TableName("sys_project")
public class Project implements Serializable {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String name;
    private String code;
    private String url;
    private String description;
    private String icon;
    private String category;
    private Integer sortOrder;
    private Boolean isEnabled;
    private Boolean isMonitorEnabled;
    private Integer checkInterval;
    private Integer timeoutSeconds;
    private String expectedStatusCode;
    private String currentStatus; // UP, DOWN, UNKNOWN
    private LocalDateTime statusChangedAt;
    private String lastCheckStatus; // UP, DOWN
    private LocalDateTime lastCheckTime;
    private Long lastResponseTime;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
