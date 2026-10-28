package com.bobapi.bcc.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.bobapi.bcc.common.Result;
import com.bobapi.bcc.dto.ProjectCreateDTO;
import com.bobapi.bcc.dto.ProjectUpdateDTO;
import com.bobapi.bcc.entity.MonitorCheckResult;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/projects")
public class AdminProjectController {

    private final ProjectService projectService;

    public AdminProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public Result<Page<Project>> getProjectPage(
            @RequestParam(value = "page", defaultValue = "1") int page,
            @RequestParam(value = "current", required = false) Integer current,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean isEnabled,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortOrder) {
        int pageNum = (current != null) ? current : page;
        return Result.success(projectService.getProjectPage(pageNum, size, keyword, category, status, isEnabled, sortBy, sortOrder));
    }

    @PostMapping
    public Result<Project> createProject(@Valid @RequestBody ProjectCreateDTO dto) {
        return Result.success(projectService.createProject(dto));
    }

    @GetMapping("/{id}")
    public Result<Project> getProjectById(@PathVariable Long id) {
        return Result.success(projectService.getProjectById(id));
    }

    @PutMapping("/{id}")
    public Result<Project> updateProject(@PathVariable Long id, @Valid @RequestBody ProjectUpdateDTO dto) {
        return Result.success(projectService.updateProject(id, dto));
    }

    @DeleteMapping("/{id}")
    public Result<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return Result.success();
    }

    @PatchMapping("/{id}/enabled")
    public Result<Void> toggleEnabled(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Boolean enabled = body.getOrDefault("enabled", true);
        projectService.toggleEnabled(id, enabled);
        return Result.success();
    }

    @PostMapping("/{id}/check")
    public Result<MonitorCheckResult> manualCheck(@PathVariable Long id) {
        return Result.success(projectService.triggerCheck(id));
    }
}
