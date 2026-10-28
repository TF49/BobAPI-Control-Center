package com.bobapi.bcc;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
@MapperScan("com.bobapi.bcc.mapper")
public class BccApplication {

    public static void main(String[] args) {
        // 全局默认时区统一设为 UTC 存储，各层根据配置格式化展示
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        SpringApplication.run(BccApplication.class, args);
    }
}
