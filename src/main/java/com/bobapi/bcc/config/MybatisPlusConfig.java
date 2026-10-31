package com.bobapi.bcc.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * MyBatis-Plus 核心配置类
 * 注册分页拦截器，避免单页查询因缺少 LIMIT 导致的全表加载严重卡顿问题
 */
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        PaginationInnerInterceptor paginationInnerInterceptor = new PaginationInnerInterceptor(DbType.MYSQL);
        paginationInnerInterceptor.setMaxLimit(500L); // 防御性设置单页最大 500 条
        paginationInnerInterceptor.setOverflow(false); // 溢出时不循环到第一页
        interceptor.addInnerInterceptor(paginationInnerInterceptor);
        return interceptor;
    }
}
