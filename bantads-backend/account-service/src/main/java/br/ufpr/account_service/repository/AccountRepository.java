package br.ufpr.account_service.repository;

import br.ufpr.account_service.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import java.util.List;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {

    Optional<Account> findByClientId(String clientId);

    Optional<Account> findByAccountNumber(String accountNumber);

    /**
     * Esta query faz a mágica:
     * 1. Calcula quantos clientes cada gerente tem.
     * 2. Filtra apenas os gerentes que têm a contagem MÁXIMA de clientes.
     * 3. Busca as contas desses gerentes que tenham saldo > 0.
     * 4. Ordena pelo menor saldo.
     */
    @Query(value = """
        SELECT * FROM account_schema.account a
        WHERE a.manager IN (
            SELECT manager_counts.manager 
            FROM (
                SELECT manager, COUNT(*) as cnt 
                FROM account_schema.account 
                GROUP BY manager
            ) manager_counts
            WHERE manager_counts.cnt = (
                SELECT MAX(cnt_inner) 
                FROM (
                    SELECT COUNT(*) as cnt_inner 
                    FROM account_schema.account 
                    GROUP BY manager
                ) max_counts
            )
        )
        AND a.balance > 0
        ORDER BY a.balance ASC
        LIMIT 1
    """, nativeQuery = true)
    Optional<Account> findAccountToReassign();

    @Query("SELECT COUNT(DISTINCT a.manager) FROM Account a")
    long countDistinctManagers();
}