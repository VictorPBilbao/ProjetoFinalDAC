package br.ufpr.client_service.repository;

import br.ufpr.client_service.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClientRepository extends JpaRepository<Client, String> {

    // Find all approved clients
    List<Client> findByAprovadoTrue();

    // Find client by email
    Client findByEmail(String email);

    // Find clients waiting for approval
    List<Client> findByAprovadoFalse();
}