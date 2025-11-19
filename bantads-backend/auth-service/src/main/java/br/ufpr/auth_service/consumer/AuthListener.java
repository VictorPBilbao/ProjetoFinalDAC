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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import br.ufpr.auth_service.repository.UserRepository;
import br.ufpr.auth_service.model.User;

@Component
public class AuthListener {

    private final ObjectMapper mapper;
    private final RabbitTemplate rabbit;
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${rabbit.auth.exchange:auth.exchange}") private String authExchange;
    @Value("${rabbit.auth.created-key:auth.created-user}") private String createdKey;
    @Value("${rabbit.auth.failed-key:auth.create-failed}") private String failedKey;
    @Value("${rabbit.auth.updated-key:auth.updated-user}") private String updatedKey;
    @Value("${rabbit.auth.update-failed-key:auth.update-failed}") private String updateFailedKey;
    @Value("${rabbit.auth.deleted-key:auth.deleted-user}") private String deletedKey;
    @Value("${rabbit.auth.delete-failed-key:auth.delete-failed}") private String deleteFailedKey;

    public AuthListener(ObjectMapper mapper, RabbitTemplate rabbit, UserRepository userRepository) {
        this.mapper = mapper;
        this.rabbit = rabbit;
        this.userRepository = userRepository;
    }

    @RabbitListener(queues = "#{authCreateQueue.name}")
    public void onCreate(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
        System.out.println("Received auth.create correlationId=" + correlationId + " payload=" + payload);
        try {
            String cpf = normalize(payload.get("cpf"));
            String senha = normalize(payload.get("senha"));
            if (cpf == null) throw new IllegalArgumentException("cpf é obrigatório");

            if (userRepository.findByCpf(cpf).isPresent()) {
                throw new DuplicateKeyException("cpf duplicado");
            }

            if (senha == null) {
                throw new IllegalArgumentException("senha é obrigatória");
            }

            User user = new User();
            user.setCpf(cpf);
            user.setNome(normalize(payload.get("nome")));
            user.setEmail(normalize(payload.get("email")));
            user.setSenha(passwordEncoder.encode(senha));
            user.setTipo(normalize(payload.get("tipo")));
            user.setAtivo(true);

            userRepository.insert(user);

            Map<String, Object> event = mapper.convertValue(user, Map.class);
            rabbit.convertAndSend(authExchange, createdKey, event, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
        } catch (Exception ex) {
            Map<String, Object> err = new HashMap<>();
            err.put("reason", ex.getMessage());
            int status = 500;
            if (ex instanceof org.springframework.dao.DuplicateKeyException) {
                status = 409;
            } else if (ex instanceof IllegalArgumentException) {
                status = 400;
            }
            err.put("status", status);
            rabbit.convertAndSend(authExchange, failedKey, err, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                m.getMessageProperties().setContentType("application/json");
                m.getMessageProperties().setContentEncoding("UTF-8");
                return m;
            });
        }
    }

    @RabbitListener(queues = "#{authUpdateQueue.name}")
    public void onUpdate(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
        System.out.println("Received auth.update correlationId=" + correlationId + " payload=" + payload);
        try {
            String cpf = normalize(payload.get("cpf"));
            if (cpf == null) throw new IllegalArgumentException("cpf é obrigatório para atualização");

            User user = userRepository.findByCpf(cpf)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

            String nome = normalize(payload.get("nome"));
            String email = normalize(payload.get("email"));
            String senha = normalize(payload.get("senha"));

            if (nome != null) user.setNome(nome);
            if (email != null) user.setEmail(email);
            if (senha != null) user.setSenha(passwordEncoder.encode(senha));

            userRepository.save(user);
            
            Map<String, Object> event = mapper.convertValue(user, Map.class);
            rabbit.convertAndSend(authExchange, updatedKey, event, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
            System.out.println("Usuário atualizado com sucesso: " + cpf);
        } catch (Exception ex) {
            Map<String, Object> err = new HashMap<>();
            err.put("reason", ex.getMessage());
            int status = 500;
            if (ex instanceof org.springframework.dao.DuplicateKeyException) {
                status = 409;
            } else if (ex instanceof IllegalArgumentException) {
                status = 400;
            }
            err.put("status", status);
            rabbit.convertAndSend(authExchange, updateFailedKey, err, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                m.getMessageProperties().setContentType("application/json");
                m.getMessageProperties().setContentEncoding("UTF-8");
                return m;
            });
            System.err.println("Erro ao atualizar usuário: " + ex.getMessage());
        }
    }

    @RabbitListener(queues = "#{authDeleteQueue.name}")
    public void onDelete(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
        System.out.println("Received auth.delete correlationId=" + correlationId + " payload=" + payload);
        try {
            String cpf = normalize(payload.get("cpf"));
            if (cpf == null) throw new IllegalArgumentException("cpf é obrigatório para deleção");

            User user = userRepository.findByCpf(cpf)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

            userRepository.delete(user);
            
            Map<String, Object> event = mapper.convertValue(user, Map.class);
            rabbit.convertAndSend(authExchange, deletedKey, event, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
            System.out.println("Usuário deletado com sucesso: " + cpf);
        } catch (Exception ex) {
            Map<String, Object> err = new HashMap<>();
            err.put("reason", ex.getMessage());
            int status = 500;
            if (ex instanceof IllegalArgumentException) {
                status = 400;
            }
            err.put("status", status);
            rabbit.convertAndSend(authExchange, deleteFailedKey, err, m -> {
                if (correlationId != null) m.getMessageProperties().setCorrelationId(correlationId);
                m.getMessageProperties().setContentType("application/json");
                m.getMessageProperties().setContentEncoding("UTF-8");
                return m;
            });
            System.err.println("Erro ao deletar usuário: " + ex.getMessage());
        }
    }

    private String normalize(Object o) {
        if (o == null) return null;
        String s = String.valueOf(o).trim();
        return s.isBlank() || "null".equalsIgnoreCase(s) ? null : s;
    }
}