package com.bobapi.bcc.service;

import com.bobapi.bcc.dto.LoginRequest;
import com.bobapi.bcc.dto.LoginResponse;
import com.bobapi.bcc.entity.User;

public interface UserService {
    LoginResponse login(LoginRequest request);
    User getCurrentUser(String username);
}
