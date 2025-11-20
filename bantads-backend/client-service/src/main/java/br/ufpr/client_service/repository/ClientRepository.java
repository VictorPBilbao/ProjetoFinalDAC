package br.ufpr.client_service.repository;

import br.ufpr.client_service.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.domain.Sort;

import java.util.List;

@Repository
public interface ClientRepository extends JpaRepository<Client, String> {

    // Find all approved clients
    List<Client> findByAprovadoTrue();

    // Find client by email
    Client findByEmail(String email);

    // Find clients waiting for approval
    List<Client> findByAprovadoFalse();

    Client findByCpf(String cpf);

    List<Client> findByGerente(String gerente, Sort sort);

    @Query("SELECT c FROM Client c WHERE c.gerente = :gerente AND (LOWER(c.nome) LIKE LOWER(CONCAT('%', :busca, '%')) OR c.cpf LIKE CONCAT('%', :busca, '%'))")
    List<Client> searchByGerenteAndTerm(@Param("gerente") String gerente, @Param("busca") String busca, Sort sort);
}
