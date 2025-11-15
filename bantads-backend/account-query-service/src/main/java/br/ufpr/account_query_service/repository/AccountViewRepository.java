package br.ufpr.account_query_service.repository;

import br.ufpr.account_query_service.model.AccountView;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;


public interface AccountViewRepository extends JpaRepository<AccountView, Long> {
    Optional<AccountView> findByClientId(String clientId);
}