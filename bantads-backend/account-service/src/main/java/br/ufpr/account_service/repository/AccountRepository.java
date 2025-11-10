package br.ufpr.account_service.repository;
import br.ufpr.account_service.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

//Repository interface for Account entity 
@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByClientId(Long clientId);
}

