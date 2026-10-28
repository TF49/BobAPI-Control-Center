package com.bobapi.bcc.controller;

import com.bobapi.bcc.common.Result;
import com.bobapi.bcc.entity.Project;
import com.bobapi.bcc.service.ProjectService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/public")
public class PublicController {

    private final ProjectService projectService;

    public PublicController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/projects")
    public Result<List<Project>> getPublicProjects() {
        return Result.success(projectService.getPublicProjects());
    }

    @GetMapping("/status")
    public Result<Map<String, Object>> getPublicStatus() {
        return Result.success(projectService.getPublicStatus());
    }

    @GetMapping("/projects/{id}/status")
    public Result<Project> getProjectStatus(@PathVariable Long id) {
        return Result.success(projectService.getPublicProjectStatus(id));
    }
}
