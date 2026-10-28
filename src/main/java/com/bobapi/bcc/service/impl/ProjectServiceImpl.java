package com.bobapi.bcc.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.bobapi.bcc.common.BusinessException;
import com.bobapi.bcc.common.ResultCode;
import com.bobapi.bcc.dto.ProjectCreateDTO;
import com.bobapi.bcc.dto.ProjectUpdateDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.mapper.ProjectMapper;
import com.bobapi.bcc.monitor.MonitorExecutor;
import com.bobapi.bcc.monitor.UrlSafetyValidator;
import com.bobapi.bcc.service.ProjectService;
import com.bobapi.bcc.service.SystemConfigService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class ProjectServiceImpl implements ProjectService {

    private final ProjectMapper projectMapper;
    private final UrlSafetyValidator safetyValidator;
    private final MonitorExecutor monitorExecutor;
    private final SystemConfigService configService;

    public ProjectServiceImpl(ProjectMapper projectMapper,
                              UrlSafetyValidator safetyValidator,
                              MonitorExecutor monitorExecutor,
                              SystemConfigService configService) {
        this.projectMapper = projectMapper;
        this.safetyValidator = safetyValidator;
        this.monitorExecutor = monitorExecutor;
        this.configService = configService;
    }

    @Override
    public List<Project> getPublicProjects() {
        return projectMapper.selectList(new LambdaQueryWrapper<Project>()
                .eq(Project::getIsEnabled, true)
                .orderByAsc(Project::getSortOrder)
                .orderByAsc(Project::getId));
    }

    @Override
    public Map<String, Object> getPublicStatus() {
        List<Project> list = getPublicProjects();
        int total = list.size();
        int online = (int) list.stream().filter(p -> "UP".equalsIgnoreCase(p.getCurrentStatus())).count();
        int offline = (int) list.stream().filter(p -> "DOWN".equalsIgnoreCase(p.getCurrentStatus())).count();
        int unknown = total - online - offline;

        Map<String, Object> map = new HashMap<>();
        map.put("total", total);
        map.put("online", online);
        map.put("offline", offline);
        map.put("unknown", unknown);
        map.put("updatedAt", LocalDateTime.now());
        return map;
    }

    @Override
    public Project getPublicProjectStatus(Long id) {
        Project project = projectMapper.selectById(id);
        if (project == null || !Boolean.TRUE.equals(project.getIsEnabled())) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "项目不存在或已停用");
        }
        return project;
    }

    @Override
    public Page<Project> getProjectPage(int page, int size, String keyword, String category, String status, Boolean isEnabled) {
        return getProjectPage(page, size, keyword, category, status, isEnabled, null, null);
    }

    @Override
    public Page<Project> getProjectPage(int page, int size, String keyword, String category, String status, Boolean isEnabled, String sortBy, String sortOrder) {
        Page<Project> pageParam = new Page<>(page, size);
        LambdaQueryWrapper<Project> wrapper = new LambdaQueryWrapper<>();

        if (StringUtils.hasText(keyword)) {
            wrapper.and(w -> w.like(Project::getName, keyword).or().like(Project::getCode, keyword).or().like(Project::getUrl, keyword));
        }
        if (StringUtils.hasText(category)) {
            wrapper.eq(Project::getCategory, category);
        }
        if (StringUtils.hasText(status)) {
            wrapper.eq(Project::getCurrentStatus, status);
        }
        if (isEnabled != null) {
            wrapper.eq(Project::getIsEnabled, isEnabled);
        }

        boolean isAsc = "asc".equalsIgnoreCase(sortOrder);
        if ("id".equalsIgnoreCase(sortBy)) {
            if (isAsc) {
                wrapper.orderByAsc(Project::getId);
            } else {
                wrapper.orderByDesc(Project::getId);
            }
        } else if ("createdAt".equalsIgnoreCase(sortBy) || "created_at".equalsIgnoreCase(sortBy)) {
            if (isAsc) {
                wrapper.orderByAsc(Project::getCreatedAt).orderByAsc(Project::getId);
            } else {
                wrapper.orderByDesc(Project::getCreatedAt).orderByDesc(Project::getId);
            }
        } else {
            // 默认排序字段：按配置的 sortOrder 排序
            if ("sortOrder".equalsIgnoreCase(sortBy) && !isAsc) {
                wrapper.orderByDesc(Project::getSortOrder).orderByDesc(Project::getId);
            } else {
                wrapper.orderByAsc(Project::getSortOrder).orderByDesc(Project::getId);
            }
        }

        return projectMapper.selectPage(pageParam, wrapper);
    }

    @Override
    public Project getProjectById(Long id) {
        Project project = projectMapper.selectById(id);
        if (project == null) {
            throw new BusinessException(ResultCode.NOT_FOUND.getCode(), "项目不存在");
        }
        return project;
    }

    @Override
    public Project createProject(ProjectCreateDTO dto) {
        safetyValidator.validateUrl(dto.getUrl());

        // 唯一标识校验
        Long count = projectMapper.selectCount(new LambdaQueryWrapper<Project>()
                .eq(Project::getCode, dto.getCode().trim()));
        if (count > 0) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "项目标识已存在: " + dto.getCode());
        }

        int defaultInterval = 600;
        int defaultTimeout = 10;
        try {
            defaultInterval = configService.getSettings().getDefaultCheckInterval();
            defaultTimeout = configService.getSettings().getDefaultTimeoutSeconds();
        } catch (Exception ignored) {
        }

        Project project = new Project();
        project.setName(dto.getName().trim());
        project.setCode(dto.getCode().trim());
        project.setUrl(dto.getUrl().trim());
        project.setDescription(dto.getDescription());
        project.setIcon(dto.getIcon());
        project.setCategory(StringUtils.hasText(dto.getCategory()) ? dto.getCategory() : "default");
        project.setSortOrder(dto.getSortOrder() != null ? dto.getSortOrder() : 0);
        project.setIsEnabled(dto.getIsEnabled() != null ? dto.getIsEnabled() : true);
        project.setIsMonitorEnabled(dto.getIsMonitorEnabled() != null ? dto.getIsMonitorEnabled() : true);
        project.setCheckInterval(dto.getCheckInterval() != null && dto.getCheckInterval() > 0 ? dto.getCheckInterval() : defaultInterval);
        project.setTimeoutSeconds(dto.getTimeoutSeconds() != null && dto.getTimeoutSeconds() > 0 ? dto.getTimeoutSeconds() : defaultTimeout);
        project.setExpectedStatusCode(StringUtils.hasText(dto.getExpectedStatusCode()) ? dto.getExpectedStatusCode() : "200-299");
        project.setCurrentStatus("UNKNOWN");
        project.setStatusChangedAt(LocalDateTime.now(ZoneOffset.UTC));

        projectMapper.insert(project);
        return project;
    }

    @Override
    public Project updateProject(Long id, ProjectUpdateDTO dto) {
        Project existing = getProjectById(id);
        safetyValidator.validateUrl(dto.getUrl());

        // 检查 code 唯一性
        Long count = projectMapper.selectCount(new LambdaQueryWrapper<Project>()
                .eq(Project::getCode, dto.getCode().trim())
                .ne(Project::getId, id));
        if (count > 0) {
            throw new BusinessException(ResultCode.CONFLICT.getCode(), "项目标识已存在: " + dto.getCode());
        }

        boolean urlChanged = !existing.getUrl().equalsIgnoreCase(dto.getUrl().trim());
        existing.setName(dto.getName().trim());
        existing.setCode(dto.getCode().trim());
        existing.setUrl(dto.getUrl().trim());
        if (urlChanged) {
            existing.setCurrentStatus("UNKNOWN");
            existing.setStatusChangedAt(LocalDateTime.now(ZoneOffset.UTC));
        }
        existing.setDescription(dto.getDescription());
        existing.setIcon(dto.getIcon());
        existing.setCategory(dto.getCategory());
        existing.setSortOrder(dto.getSortOrder());
        existing.setIsEnabled(dto.getIsEnabled());
        existing.setIsMonitorEnabled(dto.getIsMonitorEnabled());
        if (dto.getCheckInterval() != null && dto.getCheckInterval() > 0) {
            existing.setCheckInterval(dto.getCheckInterval());
        }
        if (dto.getTimeoutSeconds() != null && dto.getTimeoutSeconds() > 0) {
            existing.setTimeoutSeconds(dto.getTimeoutSeconds());
        }
        if (StringUtils.hasText(dto.getExpectedStatusCode())) {
            existing.setExpectedStatusCode(dto.getExpectedStatusCode());
        }

        projectMapper.updateById(existing);
        return existing;
    }

    @Override
    public void deleteProject(Long id) {
        // 软删除优先：如果被物理删除，将保留其检查历史外键为级联或置空，此处直接安全删除
        getProjectById(id);
        projectMapper.deleteById(id);
    }

    @Override
    public void toggleEnabled(Long id, Boolean isEnabled) {
        Project project = getProjectById(id);
        project.setIsEnabled(isEnabled);
        projectMapper.updateById(project);
    }

    @Override
    public MonitorCheckResult triggerCheck(Long id) {
        Project project = getProjectById(id);
        return monitorExecutor.executeCheck(project, "MANUAL");
    }
}
