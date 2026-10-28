package com.bobapi.bcc.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ProjectUpdateDTO {
    @NotBlank(message = "项目名称不能为空")
    private String name;

    @NotBlank(message = "项目标识不能为空")
    private String code;

    @NotBlank(message = "项目地址不能为空")
    private String url;

    private String description;
    private String icon;
    private String category;

    @NotNull(message = "排序值不能为空")
    private Integer sortOrder;

    @NotNull(message = "是否启用不能为空")
    private Boolean isEnabled;

    @NotNull(message = "是否启用监控不能为空")
    private Boolean isMonitorEnabled;

    private Integer checkInterval;
    private Integer timeoutSeconds;
    private String expectedStatusCode;
}
