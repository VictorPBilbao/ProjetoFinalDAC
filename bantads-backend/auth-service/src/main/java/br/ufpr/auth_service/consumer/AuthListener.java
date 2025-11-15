package br.ufpr.auth_service.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;

import java.util.Map;
import java.util.HashMap;

import br.ufpr.auth_service.repository.UserRepository;
import br.ufpr.auth_service.model.User;

@Component
public class AuthListener {

    private final ObjectMapper mapper;
    private final RabbitTemplate rabbit;
    private final UserRepository userRepository;

    @Value("${rabbit.auth.exchange:auth.exchange}") private String authExchange;
    @Value("${rabbit.auth.created-key:auth.created-user}") private String createdKey;
    @Value("${rabbit.auth.failed-key:auth.create-failed}") private String failedKey;

    public AuthListener(ObjectMapper mapper, RabbitTemplate rabbit, UserRepository userRepository) {
        this.mapper = mapper;
        this.rabbit = rabbit;
        this.userRepository = userRepository;
    }

    @RabbitListener(queues = "#{authCreateQueue.name}")
    public void onCreate(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

        try {
            String cpf = normalize(payload.get("cpf"));
            String senha = normalize(payload.get("senha"));
            if (cpf == null) throw new IllegalArgumentException("cpf é obrigatório");

            if (userRepository.findByCpf(cpf).isPresent()) {
                throw new DuplicateKeyException("cpf duplicado");
            }

            User user = new User();
            user.setCpf(cpf);
            user.setNome(normalize(payload.get("nome")));
            user.setEmail(normalize(payload.get("email")));
            user.setSenha(/* encode senha */ senha);
            user.setTipo(normalize(payload.get("tipo")));
            user.setAtivo(true);

            userRepository.insert(user); // use insert para evitar upsert que pode colidir com cpf=null

            Map<String, Object> event = mapper.convertValue(user, Map.class);
            rabbit.convertAndSend(authExchange, createdKey, event, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
        } catch (Exception ex) {
            Map<String, Object> err = new HashMap<>();
            err.put("reason", ex.getMessage());
            rabbit.convertAndSend(authExchange, failedKey, err, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
        }
    }

    private String normalize(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isBlank() || "null".equalsIgnoreCase(s) ? null : s;
    }
}