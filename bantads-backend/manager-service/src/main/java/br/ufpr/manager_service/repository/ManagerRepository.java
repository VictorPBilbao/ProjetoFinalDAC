package br.ufpr.manager_service.repository;

import br.ufpr.manager_service.model.Manager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface ManagerRepository extends JpaRepository<Manager, String> {
    List<Manager> findAllByOrderByNameAsc();

    boolean existsByCpf(String cpf);

    boolean existsByEmail(String email);

    Manager findByCpf(String cpf);

    @Query(value = "SELECT manager, COUNT(*) as count FROM account_schema.account GROUP BY manager", nativeQuery = true)
    List<Object[]> countClientsPerManager();
}