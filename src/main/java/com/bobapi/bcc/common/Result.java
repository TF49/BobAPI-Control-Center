package com.bobapi.bcc.common;

import lombok.Data;

import java.io.Serializable;
import java.time.Instant;

@Data
public class Result<T> implements Serializable {
    private int code;
    private String message;
    private T data;
    private long timestamp;

    public Result() {
        this.timestamp = Instant.now().toEpochMilli();
    }

    public static <T> Result<T> success() {
        return success(null);
    }

    public static <T> Result<T> success(T data) {
        Result<T> r = new Result<>();
        r.setCode(ResultCode.SUCCESS.getCode());
        r.setMessage(ResultCode.SUCCESS.getMessage());
        r.setData(data);
        return r;
    }

    public static <T> Result<T> error(ResultCode resultCode) {
        return error(resultCode.getCode(), resultCode.getMessage());
    }

    public static <T> Result<T> error(int code, String message) {
        Result<T> r = new Result<>();
        r.setCode(code);
        r.setMessage(message);
        return r;
    }

    public static <T> Result<T> error(String message) {
        Result<T> r = new Result<>();
        r.setCode(ResultCode.INTERNAL_SERVER_ERROR.getCode());
        r.setMessage(message);
        return r;
    }
}
