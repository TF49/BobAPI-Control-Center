package com.bobapi.bcc.common;

import lombok.Getter;

@Getter
public enum ResultCode {
    SUCCESS(200, "操作成功"),
    BAD_REQUEST(400, "请求参数有误"),
    UNAUTHORIZED(401, "请先登录或令牌已失效"),
    FORBIDDEN(403, "没有操作权限"),
    NOT_FOUND(404, "请求资源不存在"),
    METHOD_NOT_ALLOWED(405, "不支持的请求方法"),
    CONFLICT(409, "数据冲突或已存在"),
    INTERNAL_SERVER_ERROR(500, "系统内部异常，请稍后重试"),
    SSRF_BLOCKED(4001, "目标地址非法或禁止访问内网/敏感地址"),
    MONITOR_IN_PROGRESS(4002, "该项目正在执行检查中，请勿频繁触发");

    private final int code;
    private final String message;

    ResultCode(int code, String message) {
        this.code = code;
        this.message = message;
    }
}
