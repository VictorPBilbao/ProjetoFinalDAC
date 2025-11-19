package br.ufpr.manager_service.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;

import br.ufpr.manager_service.service.ManagerService;
import br.ufpr.manager_service.model.Manager;
import br.ufpr.manager_service.model.ManagerDTO;

import java.util.Map;
import java.util.HashMap;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

// ADDED IMPORTS
import java.io.StringWriter;
import java.io.PrintWriter;

@Component
public class ManagerListener {

    private static final Logger log = LoggerFactory.getLogger(ManagerListener.class);
    private final ObjectMapper mapper;
    private final RabbitTemplate rabbit;
    private final ManagerService managerService;

    @Value("${rabbit.managers.exchange:managers.exchange}")
    private String managersExchange;

    @Value("${rabbit.managers.created-key:manager.created}")
    private String createdKey;

    @Value("${rabbit.managers.updated-key:manager.updated}")
    private String updatedKey;

    @Value("${rabbit.managers.deleted-key:manager.deleted}")
    private String deletedKey;

    @Value("${rabbit.managers.failed-key:manager.failed}")
    private String failedKey;

    @Value("${rabbit.managers.assigned-key:manager.assigned}")
    private String assignedKey;

    public ManagerListener(ObjectMapper mapper, RabbitTemplate rabbit, ManagerService managerService) {
        this.mapper = mapper;
        this.rabbit = rabbit;
        this.managerService = managerService;
    }

    @RabbitListener(queues = "#{managersCreateQueue.name}")
    public void onCreate(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        String raw = new String(message.getBody(), StandardCharsets.UTF_8);
        log.info("Received manager.create correlationId={} body={}", correlationId, raw);
        try {
            // convert incoming payload (supports both JSON and already-mapped string
            // payload)
            Map<String, Object> payload = toMapFromBody(message.getBody(), raw);
            normalizeManagerMap(payload);
            ManagerDTO dto = mapper.convertValue(payload, ManagerDTO.class);
            Manager created = managerService.createManager(dto);

            Map<String, Object> event = mapper.convertValue(created, Map.class);
            rabbit.convertAndSend(managersExchange, createdKey, event, m -> {
                if (correlationId != null)
                    m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
            log.info("Published manager.created correlationId={} id={}", correlationId, created.getId());
        } catch (Exception ex) {
            log.error("Error processing manager.create", ex);
            sendFailed(message, ex);
        }
    }

    @RabbitListener(queues = "#{managersDeleteQueue.name}")
    public void onDelete(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        String raw = new String(message.getBody(), StandardCharsets.UTF_8);
        log.info("Received manager.delete correlationId={} body={}", correlationId, raw);
        try {
            Map<String, Object> payload = toMapFromBody(message.getBody(), raw);
            String cpf = payload.containsKey("cpf") ? String.valueOf(payload.get("cpf")) : null;
            String id = payload.containsKey("id") ? String.valueOf(payload.get("id"))
                    : (payload.containsKey("managerId") ? String.valueOf(payload.get("managerId")) : null);

            // Se CPF for fornecido, é uma deleção normal (não rollback)
            if (cpf != null && !cpf.isBlank()) {
                Manager manager = managerService.deleteManagerByCpf(cpf);

                Map<String, Object> event = new HashMap<>();
                event.put("cpf", manager.getCpf());
                event.put("id", manager.getId());

                rabbit.convertAndSend(managersExchange, deletedKey, event, m -> {
                    if (correlationId != null)
                        m.getMessageProperties().setCorrelationId(correlationId);
                    return m;
                });
                log.info("Published manager.deleted correlationId={} cpf={}", correlationId, cpf);
            }
            // Se apenas ID for fornecido, é rollback (não publica evento)
            else if (id != null && !id.isBlank()) {
                managerService.deleteManagerForRollback(id);
                log.info("Manager deletado (rollback) id={} correlationId={}", id, correlationId);
            } else {
                throw new IllegalArgumentException("CPF ou ID do manager não fornecido para deleção");
            }
        } catch (Exception ex) {
            log.error("Erro ao deletar manager: {}", ex.getMessage(), ex);
            sendFailed(message, ex);
        }
    }

    @RabbitListener(queues = "#{managersUpdateQueue.name}")
    public void onUpdate(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        String raw = new String(message.getBody(), StandardCharsets.UTF_8);
        log.info("Received manager.update correlationId={} body={}", correlationId, raw);
        try {
            String json = raw;

            // caso payload venha como Base64 ou string-escaped JSON
            if (looksLikeBase64(json)) {
                byte[] decoded = Base64.getDecoder().decode(json);
                json = new String(decoded, StandardCharsets.UTF_8);
            } else if (json.startsWith("\"") && json.endsWith("\"")) {
                json = mapper.readValue(json, String.class);
            }

            Map<String, Object> payload = toMapFromBody(message.getBody(), json);
            // extrai id
            String id = payload.containsKey("id") ? String.valueOf(payload.get("id"))
                    : (payload.get("cpf") != null ? String.valueOf(payload.get("cpf")) : null);

            // se payload estiver aninhado em "payload"
            Map<String, Object> dtoMap = payload.containsKey("payload")
                    ? (Map<String, Object>) payload.get("payload")
                    : payload;

            normalizeManagerMap(dtoMap);

            ManagerDTO dto = mapper.convertValue(dtoMap, ManagerDTO.class);
            Manager updated = managerService.updateManager(id, dto);

            Map<String, Object> event = mapper.convertValue(updated, Map.class);
            rabbit.convertAndSend(managersExchange, updatedKey, event, m -> {
                if (correlationId != null)
                    m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
            log.info("Published manager.updated correlationId={} id={}", correlationId, updated.getId());
        } catch (Exception ex) {
            log.error("Error processing manager.update", ex);
            sendFailed(message, ex);
        }
    }

    @RabbitListener(queues = "#{managersAssignQueue.name}")
    public void onAssignManager(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        String raw = new String(message.getBody(), StandardCharsets.UTF_8);
        log.info("Received manager.assign correlationId={} body={}", correlationId, raw);
        try {
            Map<String, Object> payload = toMapFromBody(message.getBody(), raw);

            String cpf = payload.containsKey("cpf") ? String.valueOf(payload.get("cpf")) : null;
            Object salario = payload.get("salario");

            Manager assignedManager = managerService.findManagerWithLeastClients();

            Map<String, Object> event = new HashMap<>();
            event.put("cpf", cpf);
            event.put("managerId", assignedManager.getId());
            event.put("salario", salario);
            event.put("nome", payload.get("nome"));
            event.put("email", payload.get("email"));

            rabbit.convertAndSend(managersExchange, assignedKey, event, m -> {
                if (correlationId != null)
                    m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
            log.info("Published manager.assigned correlationId={} managerId={}", correlationId,
                    assignedManager.getId());
        } catch (Exception ex) {
            log.error("Error processing manager.assign", ex);
            sendFailed(message, ex);
        }
    }

    // Normaliza chaves vindas em português para as propriedades esperadas por
    // ManagerDTO
    @SuppressWarnings("unchecked")
    private void normalizeManagerMap(Map<String, Object> m) {
        if (m == null)
            return;
        // nome -> name
        if (m.containsKey("nome") && !m.containsKey("name")) {
            m.put("name", m.get("nome"));
        }
        // senha -> password
        if (m.containsKey("senha") && !m.containsKey("password")) {
            m.put("password", m.get("senha"));
        }
        // telefone -> telephone
        if (m.containsKey("telefone") && !m.containsKey("telephone")) {
            m.put("telephone", m.get("telefone"));
        }
        // cpf, email already match
    }

    private boolean looksLikeBase64(String s) {
        String cleaned = s.replaceAll("\\s", "");
        return cleaned.length() % 4 == 0 && cleaned.matches("^[A-Za-z0-9+/=]+$");
    }

    // tenta transformar body/raw em Map de forma resiliente
    @SuppressWarnings("unchecked")
    private Map<String, Object> toMapFromBody(byte[] body, String raw) throws Exception {
        // se já for JSON objeto
        try {
            return mapper.readValue(raw, Map.class);
        } catch (Exception ignored) {
            // tentar desserializar caso o broker/convertor tenha colocado um objeto já
            // convertido
        }
        // fallback: tentar desserializar o byte[] como Java-serialized -> não suportado
        // aqui, tratar como erro
        // última tentativa: se mensagem foi entregue pelo
        // MessagingMessageListenerAdapter como Map payload,
        // o message.getBody() pode já ter sido convertido por outro layer; mas aqui, se
        // tudo falhar, lançar.
        throw new IllegalArgumentException("Cannot parse incoming message body to Map");
    }

    private void sendFailed(Message message, Exception ex) {
        Map<String, Object> err = new HashMap<>();
        err.put("reason", ex.getMessage());
        err.put("exception", ex.getClass().getSimpleName());
        int status = 500;
        if (ex instanceof java.util.concurrent.ExecutionException) {
            status = 500;
        } else if (ex instanceof IllegalArgumentException) {
            status = 400;
        } else if (ex instanceof DuplicateKeyException) {
            status = 409;
        }

        err.put("status", status);
        StringWriter sw = new StringWriter();
        ex.printStackTrace(new PrintWriter(sw));
        err.put("stacktrace", sw.toString());

        rabbit.convertAndSend(managersExchange, failedKey, err, m -> {
            String cid = message.getMessageProperties().getCorrelationId();
            if (cid != null)
                m.getMessageProperties().setCorrelationId(cid);
            m.getMessageProperties().setContentType("application/json");
            m.getMessageProperties().setContentEncoding("UTF-8");
            return m;
        });
    }
}