package com.bobapi.bcc.controller;

import com.bobapi.bcc.common.Result;
import com.bobapi.bcc.dto.LoginRequest;
import com.bobapi.bcc.dto.LoginResponse;
import com.bobapi.bcc.entity.User;
import com.bobapi.bcc.service.UserService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(userService.login(request));
    }

    @PostMapping("/logout")
    public Result<Void> logout() {
        return Result.success();
    }

    @GetMapping("/me")
    public Result<User> getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            return Result.error(401, "未登录");
        }
        return Result.success(userService.getCurrentUser(authentication.getName()));
    }
}
