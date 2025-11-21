package br.ufpr.auth_service.repository;

import br.ufpr.auth_service.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);

    Optional<User> findByCpf(String cpf);

    boolean existsByEmail(String email);

    boolean existsByCpf(String cpf);

    void deleteByCpf(String cpf);

    List<User> findAll();

    void deleteByTipoNot(String tipo);
}