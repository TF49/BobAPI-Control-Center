package com.bobapi.bcc.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bobapi.bcc.entity.MonitorCheckResult;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface MonitorCheckResultMapper extends BaseMapper<MonitorCheckResult> {

    @Select("SELECT " +
            "COUNT(*) as totalChecks, " +
            "COALESCE(SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END), 0) as successChecks, " +
            "COALESCE(AVG(CASE WHEN is_success = 1 THEN response_time ELSE NULL END), 0) as avgLatency " +
            "FROM monitor_check_result " +
            "WHERE project_id = #{projectId} AND check_time >= #{startTime}")
    Map<String, Object> calculateProjectStats(@Param("projectId") Long projectId, @Param("startTime") LocalDateTime startTime);

    @Select("SELECT COALESCE(AVG(response_time), 0) FROM monitor_check_result " +
            "WHERE is_success = 1 AND check_time >= #{startTime}")
    Double calculateGlobalAvgLatency(@Param("startTime") LocalDateTime startTime);

    @Select("SELECT " +
            "DATE_FORMAT(COALESCE(CONVERT_TZ(check_time, '+00:00', #{timeZoneOffset}), check_time), '%Y-%m-%d %H:00') as timeHour, " +
            "COUNT(*) as totalChecks, " +
            "COALESCE(SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END), 0) as successChecks, " +
            "COALESCE(AVG(CASE WHEN is_success = 1 THEN response_time ELSE NULL END), 0) as avgLatency " +
            "FROM monitor_check_result " +
            "WHERE project_id = #{projectId} AND check_time >= #{startTime} " +
            "GROUP BY DATE_FORMAT(COALESCE(CONVERT_TZ(check_time, '+00:00', #{timeZoneOffset}), check_time), '%Y-%m-%d %H:00') " +
            "ORDER BY timeHour ASC")
    List<Map<String, Object>> queryHourlyTrend(@Param("projectId") Long projectId,
                                               @Param("startTime") LocalDateTime startTime,
                                               @Param("timeZoneOffset") String timeZoneOffset);

    @Select("SELECT " +
            "DATE_FORMAT(COALESCE(CONVERT_TZ(check_time, '+00:00', #{timeZoneOffset}), check_time), '%Y-%m-%d %H:00') as timeHour, " +
            "COUNT(*) as totalChecks, " +
            "COALESCE(SUM(CASE WHEN is_success = 1 THEN 1 ELSE 0 END), 0) as successChecks, " +
            "COALESCE(AVG(CASE WHEN is_success = 1 THEN response_time ELSE NULL END), 0) as avgLatency " +
            "FROM monitor_check_result " +
            "WHERE check_time >= #{startTime} " +
            "GROUP BY DATE_FORMAT(COALESCE(CONVERT_TZ(check_time, '+00:00', #{timeZoneOffset}), check_time), '%Y-%m-%d %H:00') " +
            "ORDER BY timeHour ASC")
    List<Map<String, Object>> queryGlobalHourlyTrend(@Param("startTime") LocalDateTime startTime,
                                                     @Param("timeZoneOffset") String timeZoneOffset);
}
