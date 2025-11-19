package br.ufpr.account_query_service.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.ufpr.account_query_service.model.TransactionView;

public interface TransactionViewRepository extends JpaRepository<TransactionView, Long> {

    List<TransactionView> findByAccountIdAndTimestampBetweenOrderByTimestampAsc(
            Long accountId, LocalDateTime start, LocalDateTime end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM TransactionView t WHERE t.accountId = :accountId AND t.timestamp < :start")
    BigDecimal getBalanceBefore(@Param("accountId") Long accountId, @Param("start") LocalDateTime start);
}