package com.bobapi.bcc.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.bobapi.bcc.common.BusinessException;
import com.bobapi.bcc.common.ResultCode;
import com.bobapi.bcc.dto.LoginRequest;
import com.bobapi.bcc.dto.LoginResponse;
import com.bobapi.bcc.entity.User;
import com.bobapi.bcc.mapper.UserMapper;
import com.bobapi.bcc.security.JwtTokenProvider;
import com.bobapi.bcc.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class UserServiceImpl implements UserService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserMapper userMapper;

    public UserServiceImpl(AuthenticationManager authenticationManager,
                           JwtTokenProvider tokenProvider,
                           UserMapper userMapper) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.userMapper = userMapper;
    }

    @Override
    public LoginResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            String token = tokenProvider.generateToken(authentication);
            User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                    .eq(User::getUsername, request.getUsername()));

            return LoginResponse.builder()
                    .token(token)
                    .tokenType("Bearer")
                    .username(user.getUsername())
                    .nickname(user.getNickname())
                    .role(user.getRole())
                    .build();
        } catch (BadCredentialsException e) {
            log.warn("登录失败: 用户名或密码错误 [{}]", request.getUsername());
            throw new BusinessException(ResultCode.UNAUTHORIZED.getCode(), "用户名或密码错误");
        } catch (Exception e) {
            log.error("登录异常: ", e);
            throw new BusinessException(ResultCode.UNAUTHORIZED.getCode(), "认证未通过: " + e.getMessage());
        }
    }

    @Override
    public User getCurrentUser(String username) {
        User user = userMapper.selectOne(new LambdaQueryWrapper<User>()
                .eq(User::getUsername, username));
        if (user != null) {
            user.setPasswordHash(null); // 脱敏
        }
        return user;
    }
}
