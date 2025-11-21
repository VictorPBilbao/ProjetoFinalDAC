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

    private static final Logger log = LoggerFactory.getLogger(SagaService.class);

    private final RabbitTemplate rabbit;
    private final Map<String, SagaResult> sagaResults = new ConcurrentHashMap<>();
    private final Map<String, String> correlationToManagerId = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> correlationToClientData = new ConcurrentHashMap<>();

    @Value("${saga.wait-millis:3000}")
    private long waitMillis;

    @Value("${rabbit.managers.exchange:managers.exchange}")
    private String managersExchange;

    @Value("${rabbit.managers.create-key:manager.create}")
    private String managersCreateKey;

    @Value("${rabbit.managers.delete-key:manager.delete}")
    private String managersDeleteKey;

    @Value("${rabbit.managers.update-key:manager.update}")
    private String managersUpdateKey;

    @Value("${rabbit.auth.exchange:auth.exchange}")
    private String authExchange;

    @Value("${rabbit.auth.create-key:auth.create-user}")
    private String authCreateKey;

    @Value("${rabbit.auth.update-key:auth.update-user}")
    private String authUpdateKey;

    @Value("${rabbit.auth.delete-key:auth.delete-user}")
    private String authDeleteKey;

    @Value("${rabbit.clients.exchange:clients.exchange}")
    private String clientsExchange;

    @Value("${rabbit.clients.approve-key:client.approve}")
    private String clientsApproveKey;

    public SagaService(RabbitTemplate rabbit) {
        this.rabbit = rabbit;
    }

    public SagaResult createManagerSaga(Map<String, Object> managerDto) {
        String correlationId = UUID.randomUUID().toString();

        try {
            sendEvent(managersExchange, managersCreateKey, managerDto, correlationId);

            Map<String, Object> result = Map.of(
                    "correlationId", correlationId,
                    "status", "pending");

            SagaResult pending = new SagaResult(true, "create-manager", "Aguardando criação", result, 202);
            sagaResults.put(correlationId, pending);

            return waitForResult(correlationId, pending);
        } catch (Exception ex) {
            log.error("Erro ao criar manager: {}", ex.getMessage(), ex);
            return new SagaResult(false, "create-manager", "Erro ao publicar evento: " + ex.getMessage(), null, 500);
        }
    }

    public SagaResult updateManagerSaga(String managerId, Map<String, Object> managerDto, String authorizationHeader) {
        String correlationId = UUID.randomUUID().toString();

        try {
            correlationToManagerId.put(correlationId, managerId);

            Map<String, Object> updateCmd = Map.of(
                    "id", managerId,
                    "payload", managerDto);
            sendEvent(managersExchange, managersUpdateKey, updateCmd, correlationId);

            Map<String, Object> result = Map.of(
                    "correlationId", correlationId,
                    "status", "pending");

            SagaResult pending = new SagaResult(true, "update-manager", "Aguardando atualização", result, 202);
            sagaResults.put(correlationId, pending);

            return waitForResult(correlationId, pending);
        } catch (Exception ex) {
            log.error("Erro ao atualizar manager: {}", ex.getMessage(), ex);
            return new SagaResult(false, "update-manager", "Erro ao publicar evento: " + ex.getMessage(), null, 500);
        }
    }

    public SagaResult deleteManagerSaga(String cpf) {
        String correlationId = UUID.randomUUID().toString();

        try {
            Map<String, Object> deleteCmd = Map.of("cpf", cpf);
            sendEvent(managersExchange, managersDeleteKey, deleteCmd, correlationId);

            Map<String, Object> result = Map.of(
                    "correlationId", correlationId,
                    "status", "pending");

            SagaResult pending = new SagaResult(true, "delete-manager", "Aguardando deleção", result, 202);
            sagaResults.put(correlationId, pending);

            return waitForResult(correlationId, pending);
        } catch (Exception ex) {
            log.error("Erro ao deletar manager: {}", ex.getMessage(), ex);
            return new SagaResult(false, "delete-manager", "Erro ao publicar evento: " + ex.getMessage(), null, 500);
        }
    }

    public SagaResult approveClientSaga(String cpf) {
        String correlationId = UUID.randomUUID().toString();

        try {
            Map<String, Object> approveCmd = Map.of("cpf", cpf);
            sendEvent(clientsExchange, clientsApproveKey, approveCmd, correlationId);

            Map<String, Object> result = Map.of(
                    "correlationId", correlationId,
                    "status", "pending");

            SagaResult pending = new SagaResult(true, "approve-client", "Aguardando aprovação", result, 202);
            sagaResults.put(correlationId, pending);

            return waitForResult(correlationId, pending);
        } catch (Exception ex) {
            log.error("Erro ao aprovar cliente: {}", ex.getMessage(), ex);
            return new SagaResult(false, "approve-client", "Erro ao publicar evento: " + ex.getMessage(), null, 500);
        }
    }

    private void sendEvent(String exchange, String routingKey, Object payload, String correlationId) {
        rabbit.convertAndSend(exchange, routingKey, payload, message -> {
            message.getMessageProperties().setCorrelationId(correlationId);
            return message;
        });
    }

    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    private SagaResult waitForResult(String correlationId, SagaResult pending) {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < waitMillis) {
            SagaResult current = sagaResults.get(correlationId);
            if (current != null && current.getStatusCode() != 202) {
                return current;
            }
            try {
                Thread.sleep(200);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        return pending;
    }

    public void sendRollbackManager(String managerId, String correlationId) {
        log.warn("⏪ [SAGA] Rollback do manager {}", managerId);
        sendEvent(managersExchange, managersDeleteKey, Map.of("id", managerId), correlationId);
    }

    public void handleManagerCreated(String correlationId, Map<String, Object> payload) {
        if (correlationId == null)
            return;

        String managerId = getString(payload, "id");
        if (managerId == null)
            managerId = getString(payload, "managerId");

        if (managerId != null) {
            correlationToManagerId.put(correlationId, managerId);
        }

        Map<String, Object> authPayload = new HashMap<>();
        authPayload.put("cpf", getString(payload, "cpf"));
        authPayload.put("nome", getString(payload, "name"));
        authPayload.put("email", getString(payload, "email"));
        authPayload.put("senha", getString(payload, "password"));
        authPayload.put("tipo", "GERENTE");
        authPayload.put("managerId", managerId);

        log.info("[SAGA] Manager criado, publicando auth correlationId={}", correlationId);

        try {
            sendEvent(authExchange, authCreateKey, authPayload, correlationId);
            sagaResults.put(correlationId, new SagaResult(true, "create-manager", "Aguardando auth",
                    Map.of("correlationId", correlationId, "status", "pending-auth"), 202));
        } catch (Exception ex) {
            log.error("Erro ao publicar auth.create-user: {}", ex.getMessage(), ex);
            notifyGatewayFailure(correlationId, "Erro ao criar autenticação: " + ex.getMessage(), 500);
        }
    }

    public void handleManagerUpdated(String correlationId, Map<String, Object> payload) {
        if (correlationId == null)
            return;

        String managerId = getString(payload, "id");
        if (managerId == null)
            managerId = getString(payload, "managerId");

        Map<String, Object> authPayload = new HashMap<>();
        authPayload.put("cpf", getString(payload, "cpf"));
        authPayload.put("nome", getString(payload, "name"));
        authPayload.put("email", getString(payload, "email"));
        authPayload.put("senha", getString(payload, "password"));
        authPayload.put("tipo", "MANAGER");
        authPayload.put("managerId", managerId);

        log.info("[SAGA] Manager atualizado, publicando auth correlationId={}", correlationId);

        try {
            sendEvent(authExchange, authUpdateKey, authPayload, correlationId);
            sagaResults.put(correlationId, new SagaResult(true, "update-manager", "Aguardando auth",
                    Map.of("correlationId", correlationId, "status", "pending-auth"), 202));
        } catch (Exception ex) {
            log.error("Erro ao publicar auth.update-user: {}", ex.getMessage(), ex);
            notifyUpdateFailure(correlationId, "Erro ao atualizar autenticação: " + ex.getMessage(), 500);
        }
    }

    public void handleAuthFailure(String correlationId, String errorMessage, int statusCode) {
        log.warn("[SAGA] Auth falhou correlationId={} erro={} status={}", correlationId, errorMessage, statusCode);

        String managerId = correlationToManagerId.get(correlationId);
        if (managerId != null) {
            sendRollbackManager(managerId, correlationId);
        }

        notifyGatewayFailure(correlationId, errorMessage != null ? errorMessage : "Falha na autenticação",
                statusCode > 0 ? statusCode : 400);
    }

    public SagaResult getSagaResult(String correlationId) {
        return sagaResults.get(correlationId);
    }

    public void notifyGatewaySuccess(String correlationId, String cpf, String nome) {
        sagaResults.put(correlationId, new SagaResult(true, "create-manager", "Manager criado com sucesso",
                Map.of("cpf", cpf != null ? cpf : "", "nome", nome != null ? nome : ""), 201));
    }

    public void notifyGatewayFailure(String correlationId, String errorMessage, int statusCode) {
        int code = statusCode > 0 ? statusCode : 400;
        sagaResults.put(correlationId, new SagaResult(false, "create-manager", errorMessage,
                Map.of("erro", errorMessage, "statusCode", code), code));
    }

    public void notifyUpdateSuccess(String correlationId) {
        sagaResults.put(correlationId, new SagaResult(true, "update-manager", "Manager atualizado com sucesso",
                Map.of("correlationId", correlationId), 200));
    }

    public void notifyUpdateFailure(String correlationId, String errorMessage, int statusCode) {
        int code = statusCode > 0 ? statusCode : 400;
        sagaResults.put(correlationId, new SagaResult(false, "update-manager", errorMessage,
                Map.of("erro", errorMessage, "statusCode", code), code));
    }

    public void handleManagerDeleted(String correlationId, Map<String, Object> payload) {
        if (correlationId == null)
            return;

        String cpf = getString(payload, "cpf");

        log.info("[SAGA] Manager deletado, publicando auth.delete correlationId={}", correlationId);

        try {
            Map<String, Object> authPayload = Map.of("cpf", cpf);
            sendEvent(authExchange, authDeleteKey, authPayload, correlationId);
            sagaResults.put(correlationId, new SagaResult(true, "delete-manager", "Aguardando auth",
                    Map.of("correlationId", correlationId, "status", "pending-auth"), 202));
        } catch (Exception ex) {
            log.error("Erro ao publicar auth.delete-user: {}", ex.getMessage(), ex);
            notifyDeleteFailure(correlationId, "Erro ao deletar autenticação: " + ex.getMessage(), 500);
        }
    }

    public void notifyDeleteSuccess(String correlationId) {
        sagaResults.put(correlationId, new SagaResult(true, "delete-manager", "Manager deletado com sucesso",
                Map.of("correlationId", correlationId), 200));
    }

    public void notifyDeleteFailure(String correlationId, String errorMessage, int statusCode) {
        int code = statusCode > 0 ? statusCode : 400;
        sagaResults.put(correlationId, new SagaResult(false, "delete-manager", errorMessage,
                Map.of("erro", errorMessage, "statusCode", code), code));
    }

    public void handleClientApproved(String correlationId, Map<String, Object> payload) {
        if (correlationId == null)
            return;

        String cpf = getString(payload, "cpf");
        String nome = getString(payload, "nome");
        String email = getString(payload, "email");
        Object salario = payload.get("salario");

        // Store client data for later use
        Map<String, Object> clientData = new HashMap<>();
        clientData.put("cpf", cpf);
        clientData.put("nome", nome);
        clientData.put("email", email);
        clientData.put("salario", salario);
        correlationToClientData.put(correlationId, clientData);

        log.info("[SAGA] Cliente aprovado, solicitando atribuição de gerente correlationId={}", correlationId);

        Map<String, Object> managerPayload = new HashMap<>();
        managerPayload.put("cpf", cpf);
        managerPayload.put("nome", nome);
        managerPayload.put("email", email);
        managerPayload.put("salario", salario);

        try {
            sendEvent(managersExchange, "manager.assign", managerPayload, correlationId);
            sagaResults.put(correlationId, new SagaResult(true, "approve-client", "Aguardando atribuição de gerente",
                    Map.of("correlationId", correlationId, "status", "pending-manager"), 202));
        } catch (Exception ex) {
            log.error("Erro ao publicar manager.assign: {}", ex.getMessage(), ex);
            notifyApproveClientFailure(correlationId, "Erro ao atribuir gerente: " + ex.getMessage(), 500);
        }
    }

    public void handleManagerAssigned(String correlationId, Map<String, Object> payload) {
        if (correlationId == null)
            return;

        String cpf = getString(payload, "cpf");
        String managerId = getString(payload, "managerId");
        Object salario = payload.get("salario");

        log.info("[SAGA] Gerente atribuído, criando conta correlationId={}", correlationId);

        Map<String, Object> accountPayload = new HashMap<>();
        accountPayload.put("clientId", cpf);
        accountPayload.put("managerId", managerId);
        accountPayload.put("salary", salario);

        try {
            sendEvent("saga.exchange", "saga.account.create", accountPayload, correlationId);
            sagaResults.put(correlationId, new SagaResult(true, "approve-client", "Aguardando criação de conta",
                    Map.of("correlationId", correlationId, "status", "pending-account"), 202));
        } catch (Exception ex) {
            log.error("Erro ao publicar saga.account.create: {}", ex.getMessage(), ex);
            notifyApproveClientFailure(correlationId, "Erro ao criar conta: " + ex.getMessage(), 500);
        }
    }

    public void handleAccountCreated(String correlationId, Map<String, Object> payload) {
        if (correlationId == null)
            return;

        String clientId = getString(payload, "clientId");
        String accountNumber = getString(payload, "accountNumber");

        log.info("[SAGA] Conta criada, criando autenticação e senha correlationId={}", correlationId);

        // Get client data from earlier in the flow
        Map<String, Object> clientData = correlationToClientData.get(correlationId);
        String nome = clientData != null ? (String) clientData.get("nome") : null;
        String email = clientData != null ? (String) clientData.get("email") : null;

        Map<String, Object> authPayload = new HashMap<>();
        authPayload.put("cpf", clientId);
        authPayload.put("nome", nome);
        authPayload.put("email", email);
        authPayload.put("tipo", "CLIENT");
        authPayload.put("generatePassword", true);
        authPayload.put("accountNumber", accountNumber); // Pass account number through

        try {
            sendEvent(authExchange, authCreateKey, authPayload, correlationId);
            sagaResults.put(correlationId, new SagaResult(true, "approve-client", "Aguardando criação de autenticação",
                    Map.of("correlationId", correlationId, "status", "pending-auth", "conta", accountNumber), 202));
        } catch (Exception ex) {
            log.error("Erro ao publicar auth.create-user: {}", ex.getMessage(), ex);
            notifyApproveClientFailure(correlationId, "Erro ao criar autenticação: " + ex.getMessage(), 500);
        }
    }

    public void notifyApproveClientSuccess(String correlationId, Map<String, Object> accountData) {
        sagaResults.put(correlationId, new SagaResult(true, "approve-client", "Cliente aprovado com sucesso",
                accountData, 200));
    }

    public void notifyApproveClientFailure(String correlationId, String errorMessage, int statusCode) {
        int code = statusCode > 0 ? statusCode : 400;
        sagaResults.put(correlationId, new SagaResult(false, "approve-client", errorMessage,
                Map.of("erro", errorMessage, "statusCode", code), code));
    }
}