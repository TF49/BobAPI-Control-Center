package com.bobapi.bcc.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.bobapi.bcc.dto.ProjectCreateDTO;
import com.bobapi.bcc.dto.ProjectUpdateDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;

import java.util.List;
import java.util.Map;

public interface ProjectService {
    // 公开接口方法
    List<Project> getPublicProjects();
    Map<String, Object> getPublicStatus();
    Project getPublicProjectStatus(Long id);

    // 管理接口方法
    Page<Project> getProjectPage(int page, int size, String keyword, String category, String status, Boolean isEnabled);
    Page<Project> getProjectPage(int page, int size, String keyword, String category, String status, Boolean isEnabled, String sortBy, String sortOrder);
    Project getProjectById(Long id);
    Project createProject(ProjectCreateDTO dto);
    Project updateProject(Long id, ProjectUpdateDTO dto);
    void deleteProject(Long id);
    void toggleEnabled(Long id, Boolean isEnabled);
    MonitorCheckResult triggerCheck(Long id);
}
