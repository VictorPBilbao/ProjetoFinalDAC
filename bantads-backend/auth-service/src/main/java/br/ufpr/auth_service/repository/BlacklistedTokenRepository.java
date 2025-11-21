package br.ufpr.auth_service.repository;

import br.ufpr.auth_service.model.BlacklistedToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface BlacklistedTokenRepository extends MongoRepository<BlacklistedToken, String> {
    Optional<BlacklistedToken> findByToken(String token);
}