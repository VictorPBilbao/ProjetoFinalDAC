package br.ufpr.account_query_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.ufpr.account_query_service.model.AccountView;

public interface AccountViewRepository extends JpaRepository<AccountView, Long> {

        Optional<AccountView> findByClientId(String clientId);

        Optional<AccountView> findByAccountNumber(String accountNumber);

        @Query(value = "SELECT manager_id as managerId, COUNT(*) as qtd, "
                        + "SUM(CASE WHEN balance >= 0 THEN balance ELSE 0 END) as totalPositivo, "
                        + "SUM(CASE WHEN balance < 0 THEN balance ELSE 0 END) as totalNegativo "
                        + "FROM account_query_schema.account_view "
                        + "GROUP BY manager_id", nativeQuery = true)
        List<Object[]> summaryByManager();

        @Query(value = "SELECT * FROM account_query_schema.account_view "
                        + "WHERE manager_id = :managerCpf "
                        + "ORDER BY balance DESC "
                        + "LIMIT :limit", nativeQuery = true)
        List<AccountView> findTopAccountsByManager(@Param("managerCpf") String managerCpf,
                        @Param("limit") int limit);

}