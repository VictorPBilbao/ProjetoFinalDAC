package main.java.br.ufpr.account_query_service.repository;

import br.ufpr.account_query_service.model.TransactionView;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionViewRepository extends JpaRepository<TransactionView, Long> {
    List<TransactionView> findByAccountIdAndTimestampBetweenOrderByTimestampAsc(
            Long accountId, LocalDateTime startDate, LocalDateTime endDate);
}