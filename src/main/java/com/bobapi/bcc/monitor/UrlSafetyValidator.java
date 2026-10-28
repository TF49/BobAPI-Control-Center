package com.bobapi.bcc.monitor;

import com.bobapi.bcc.common.BusinessException;
import com.bobapi.bcc.common.ResultCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.util.regex.Pattern;

@Slf4j
@Component
public class UrlSafetyValidator {

    private final Pattern domainPattern;
    private final boolean allowPrivateIp;

    public UrlSafetyValidator(@Value("${bcc.monitor.allowed-domain-pattern:^([a-zA-Z0-9-]+\\.)*(bob-api\\.com|bobdong\\.cn|dongtoken\\.com)$}") String patternStr,
                              @Value("${bcc.monitor.allow-private-ip:false}") boolean allowPrivateIp) {
        this.domainPattern = Pattern.compile(patternStr, Pattern.CASE_INSENSITIVE);
        this.allowPrivateIp = allowPrivateIp;
    }

    /**
     * 校验 URL 安全性（HTTPS、域名白名单、SSRF 与私网 IP 检测）
     */
    public void validateUrl(String urlString) {
        if (urlString == null || urlString.isBlank()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "URL 不能为空");
        }

        URI uri;
        try {
            uri = URI.create(urlString.trim());
        } catch (Exception e) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "URL 格式不合法: " + e.getMessage());
        }

        // 1. 协议必须是 HTTPS
        String scheme = uri.getScheme();
        if (scheme == null || !scheme.equalsIgnoreCase("https")) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "只允许监控安全 HTTPS 协议链接");
        }

        // 2. 主机名提取与校验
        String host = uri.getHost();
        if (host == null || host.isBlank()) {
            throw new BusinessException(ResultCode.BAD_REQUEST.getCode(), "URL 主机名不能为空");
        }

        // 3. 域名白名单校验
        if (!domainPattern.matcher(host).matches()) {
            log.warn("域名未在预先批准的允许列表中: {}", host);
            throw new BusinessException(ResultCode.SSRF_BLOCKED.getCode(), "域名未在预先批准的监控白名单内: " + host);
        }

        // 4. DNS 解析并防御 SSRF (禁止回环、私网、云元数据)
        if (!allowPrivateIp) {
            try {
                InetAddress[] addresses = InetAddress.getAllByName(host);
                for (InetAddress address : addresses) {
                    if (address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress() || address.isAnyLocalAddress()) {
                        log.warn("SSRF 拦截: 域名 {} 解析到私网/回环 IP {}", host, address.getHostAddress());
                        throw new BusinessException(ResultCode.SSRF_BLOCKED.getCode(), "禁止访问私网或本地受限 IP 地址");
                    }
                    // 169.254.x.x 云厂商元数据地址检测
                    byte[] raw = address.getAddress();
                    if (raw.length == 4 && (raw[0] & 0xFF) == 169 && (raw[1] & 0xFF) == 254) {
                        log.warn("SSRF 拦截: 域名 {} 解析到元数据 IP {}", host, address.getHostAddress());
                        throw new BusinessException(ResultCode.SSRF_BLOCKED.getCode(), "禁止访问云元数据服务地址");
                    }
                }
            } catch (BusinessException be) {
                throw be;
            } catch (Exception e) {
                // DNS 无法解析或网络异常
                log.warn("域名 DNS 解析失败: {}, 原因: {}", host, e.getMessage());
                // DNS 解析失败不阻断保存，但记录告警，由监控执行时记录详细错误类型
            }
        } else {
            log.debug("当前处于开发/测试模式，已放行私网 IP 探测: {}", host);
        }
    }
}
