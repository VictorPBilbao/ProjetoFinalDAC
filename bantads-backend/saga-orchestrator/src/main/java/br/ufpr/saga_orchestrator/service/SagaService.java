package br.ufpr.saga_orchestrator.service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.UUID;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.ufpr.saga_orchestrator.result.SagaResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class SagaService {

    private final RabbitTemplate rabbit;
    private final ObjectMapper mapper;
    private final String managersExchange;
    private final String managersCreateKey;
    private final String managersDeleteKey;
    private final String managersGetKey;
    private final String managersUpdateKey;
    private final String authExchange;
    private final String authCreateKey;
    private final String authUpdateKey;

    private static final Logger log = LoggerFactory.getLogger(SagaService.class);
    private final Map<String, SagaResult> sagaResults = new ConcurrentHashMap<>();
    // guarda managerId (ou dados relevantes) por correlationId para rollback
    private final Map<String, String> correlationToManagerId = new ConcurrentHashMap<>();
    @Value("${saga.wait-millis:3000}")
    private long waitMillis;

    public SagaService(
            RabbitTemplate rabbit,
            ObjectMapper mapper,
            @Value("${rabbit.managers.exchange:managers.exchange}") String managersExchange,
            @Value("${rabbit.managers.create-key:manager.create}") String managersCreateKey,
            @Value("${rabbit.managers.delete-key:manager.delete}") String managersDeleteKey,
            @Value("${rabbit.managers.get-key:manager.get}") String managersGetKey,
            @Value("${rabbit.managers.update-key:manager.update}") String managersUpdateKey,
            @Value("${rabbit.auth.exchange:auth.exchange}") String authExchange,
            @Value("${rabbit.auth.create-key:auth.create-user}") String authCreateKey,
            @Value("${rabbit.auth.update-key:auth.update-user}") String authUpdateKey) {
        this.rabbit = rabbit;
        this.mapper = mapper;
        this.managersExchange = managersExchange;
        this.managersCreateKey = managersCreateKey;
        this.managersDeleteKey = managersDeleteKey;
        this.managersGetKey = managersGetKey;
        this.managersUpdateKey = managersUpdateKey;
        this.authExchange = authExchange;
        this.authCreateKey = authCreateKey;
        this.authUpdateKey = authUpdateKey;
    }

    public SagaResult createManagerSaga(Map<String, Object> managerDto) {
        // gera correlationId para rastreamento entre eventos
        String correlationId = UUID.randomUUID().toString();

        try {
            // 1) publicar comando para criação do manager (consumer deve processar)
            // publish only manager.create for now. After manager.created is received
            // the saga will publish auth.create.
            sendEvent(managersExchange, managersCreateKey, managerDto, correlationId);

            Map<String, Object> result = new HashMap<>();
            result.put("correlationId", correlationId);
            result.put("status", "pending-manager");

            // store initial pending result so API Gateway can poll for final state
            SagaResult pending = new SagaResult(true, "create-manager", "Manager create event published, waiting result", result, 202);
            sagaResults.put(correlationId, pending);

            // wait a short time for manager to respond (synchronous fast failures like validation)
            long start = System.currentTimeMillis();
            while (System.currentTimeMillis() - start < waitMillis) {
                SagaResult current = sagaResults.get(correlationId);
                if (current != null && current.getStatusCode() != 202) {
                    return current; // final result arrived
                }
                try {
                    Thread.sleep(200);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            // no final result within waitMillis -> return pending (202)
            return pending;
        } catch (Exception ex) {
            return new SagaResult(false, "create-manager", "Erro ao publicar eventos: " + ex.getMessage(), null, 500);
        }
    }

    public SagaResult updateManagerSaga(String managerId, Map<String, Object> managerDto, String authorizationHeader) {
        String correlationId = UUID.randomUUID().toString();

        try {
            // 1) publicar comando para atualização do manager
            Map<String, Object> updateCmd = new HashMap<>();
            updateCmd.put("id", managerId);
            updateCmd.put("payload", managerDto);
            sendEvent(managersExchange, managersUpdateKey, updateCmd, correlationId);

            System.out.println("managerDto: " + managerDto);
            // 2) publicar comando para atualizar credenciais no auth (dados disponíveis)
            String cpf = asString(managerDto, "cpf");
            String nome = asString(managerDto, "nome");
            String email = asString(managerDto, "email");
            String senha = asString(managerDto, "senha");

            if (cpf == null || cpf.isBlank()) {
                // se cpf não estiver no body, incluir id como referência para consumer resolver
                // consumer do manager pode publicar evento com cpf depois; aqui apenas publica o pedido
                log.warn("CPF ausente no request de update; auth consumer deve resolver via manager service.");
            }

            Map<String, Object> authPayload = new HashMap<>();
            authPayload.put("cpf", cpf);
            if (nome != null) authPayload.put("nome", nome);
            if (email != null) authPayload.put("email", email);
            if (senha != null) authPayload.put("senha", senha);
            authPayload.put("tipo", "MANAGER");
            authPayload.put("correlationId", correlationId);
            authPayload.put("managerId", managerId);

            sendEvent(authExchange, authUpdateKey, authPayload, correlationId);

            Map<String, Object> result = new HashMap<>();
            result.put("correlationId", correlationId);
            result.put("status", "events-published");

            return new SagaResult(true, "update-manager", "Eventos publicados para atualização (async)", result, 200);
        } catch (Exception ex) {
            return new SagaResult(false, "update-manager", "Erro ao publicar eventos: " + ex.getMessage(), null, 500);
        }
    }

    // publica evento no exchange com routing key, adicionando correlation id no properties
    private void sendEvent(String exchange, String routingKey, Object payload, String correlationId) {
        rabbit.convertAndSend(exchange, routingKey, payload, message -> {
            if (correlationId != null) {
                message.getMessageProperties().setCorrelationId(correlationId);
            }
            message.getMessageProperties().setContentType("application/json");
            message.getMessageProperties().setContentEncoding("utf-8");
            return message;
        });
    }

    // tenta converter resposta para Map — mantido para casos onde consumers possam enviar strings JSON de retorno
    @SuppressWarnings("unchecked")
    private Map<String, Object> toMap(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Map) return (Map<String, Object>) obj;
        try {
            if (obj instanceof String) {
                return mapper.readValue((String) obj, Map.class);
            }
            return mapper.convertValue(obj, Map.class);
        } catch (Exception e) {
            log.warn("Falha ao converter resposta para Map: {}", e.getMessage());
            return null;
        }
    }

    private String asString(Map<?, ?> m, String key) {
        if (m == null) return null;
        Object v = m.get(key);
        if (v == null) return null;
        String s = String.valueOf(v).trim();
        return "null".equalsIgnoreCase(s) || s.isBlank() ? null : s;
    }

    public void sendRollbackManager(String managerId, String correlationId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("managerId", managerId);
        payload.put("correlationId", correlationId);

        log.warn("⏪ [SAGA] Publicando evento de rollback do manager {}", managerId);

        sendEvent(
            managersExchange,
            managersDeleteKey,
            payload,
            correlationId
        );
    }

    /**
     * Called by SagaListener when a manager.created event is received.
     * Will publish the auth.create-user event carrying correlationId.
     */
    public void handleManagerCreated(String correlationId, Map<String, Object> managerPayload) {
        if (correlationId == null) {
            log.warn("handleManagerCreated called without correlationId");
            return;
        }

        // extract managerId for potential rollback
        String managerId = null;
        if (managerPayload != null) {
            Object idObj = managerPayload.get("id");
            if (idObj == null) idObj = managerPayload.get("managerId");
            if (idObj != null) managerId = String.valueOf(idObj);
        }
        if (managerId != null) correlationToManagerId.put(correlationId, managerId);

        // prepare auth payload from manager payload
        String cpf = managerPayload != null && managerPayload.get("cpf") != null ? String.valueOf(managerPayload.get("cpf")) : null;
        String nome = managerPayload != null && managerPayload.get("nome") != null ? String.valueOf(managerPayload.get("nome")) : null;
        String email = managerPayload != null && managerPayload.get("email") != null ? String.valueOf(managerPayload.get("email")) : null;
        String senha = managerPayload != null && managerPayload.get("senha") != null ? String.valueOf(managerPayload.get("senha")) : null;
        String tipo = "MANAGER";
        Map<String, Object> authPayload = new HashMap<>();
        if (cpf != null) authPayload.put("cpf", cpf);
        if (nome != null) authPayload.put("nome", nome);
        if (email != null) authPayload.put("email", email);
        authPayload.put("tipo", "MANAGER");
        authPayload.put("correlationId", correlationId);
        if (managerId != null) authPayload.put("managerId", managerId);

        log.info("[SAGA] manager.created received; publishing auth.create-user correlationId={} managerId={}", correlationId, managerId);
        try {
            sendEvent(authExchange, authCreateKey, authPayload, correlationId);

            Map<String, Object> pending = new HashMap<>();
            pending.put("correlationId", correlationId);
            pending.put("status", "pending-auth");
            sagaResults.put(correlationId, new SagaResult(true, "create-manager", "Auth create event published, waiting result", pending, 202));
        } catch (Exception ex) {
            log.error("Failed to publish auth.create-user for correlationId={}", correlationId, ex);
            notifyGatewayFailure(correlationId, "Erro ao publicar evento para auth: " + ex.getMessage(), 500);
        }
    }

    /**
     * Called when auth has failed. Will trigger rollback on manager if we have managerId.
     */
    public void handleAuthFailure(String correlationId, String errorMessage, int statusCode) {
        log.warn("[SAGA] auth failed for correlationId={} error={} status={}", correlationId, errorMessage, statusCode);
        // try rollback
        String managerId = correlationToManagerId.get(correlationId);
        if (managerId != null) {
            sendRollbackManager(managerId, correlationId);
        }
        notifyGatewayFailure(correlationId, errorMessage != null ? errorMessage : "Auth failure", statusCode > 0 ? statusCode : 400);
    }

    public SagaResult getSagaResult(String correlationId) {
        return sagaResults.get(correlationId);
    }

    public void notifyGatewaySuccess(String correlationId, String cpf, String nome) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("cpf", cpf);
        detail.put("nome", nome);

        SagaResult result = new SagaResult(
                true,
                "create-manager",
                "Eventos publicados para criação (async)",
                detail,
                201
        );

        sagaResults.put(correlationId, result);
    }

    public void notifyGatewayFailure(String correlationId, String errorMessage, int statusCode) {
        Map<String, Object> detail = new HashMap<>();
        detail.put("erro", errorMessage);

        int code = statusCode <= 0 ? 400 : statusCode;

        SagaResult result = new SagaResult(
                false,
                "create-manager",
                errorMessage,
                detail,
                code
        );

        sagaResults.put(correlationId, result);
    }
}