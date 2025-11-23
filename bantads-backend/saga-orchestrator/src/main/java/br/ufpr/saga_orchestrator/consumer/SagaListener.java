package br.ufpr.saga_orchestrator.consumer;

import org.springframework.stereotype.Component;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;

import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.ufpr.saga_orchestrator.service.SagaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

@Component
public class SagaListener {

    private static final Logger log = LoggerFactory.getLogger(SagaListener.class);

    private final SagaService saga;
    private final ObjectMapper mapper;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public SagaListener(SagaService saga, ObjectMapper mapper) {
        this.saga = saga;
        this.mapper = mapper;
    }

    @RabbitListener(queues = "#{managerCreatedQueue.name}")
    public void onManagerCreated(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Manager criado correlationId={}", correlationId);
            log.info("Payload: {}", payload);
            saga.handleManagerCreated(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar manager.created: {}", ex.getMessage());
            saga.notifyGatewayFailure(correlationId, "Erro ao processar criação do manager: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{managerFailedQueue.name}")
    public void onManagerFailure(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Manager falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyGatewayFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar manager.failed: {}", ex.getMessage());
            saga.notifyGatewayFailure(correlationId, "Erro ao processar falha do manager: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{managerUpdatedQueue.name}")
    public void onManagerUpdated(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Manager atualizado correlationId={}", correlationId);
            saga.handleManagerUpdated(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar manager.updated: {}", ex.getMessage());
        }
    }

    @RabbitListener(queues = "#{authCreatedQueue.name}")
    public void onAuthCreated(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String cpf = getString(payload, "cpf");
            String nome = getString(payload, "nome");
            String accountNumber = "";
            String limit = "";
            String tipo = getString(payload, "tipo");

            if ("GERENTE".equalsIgnoreCase(tipo)) {
                log.info("Novo gerente detectado: {}. Enviando para account-service.", cpf);
                // Envia para uma fila específica de criação de gerente
                rabbitTemplate.convertAndSend("saga.exchange", "account.crud-manager.created", payload, m -> {
                    m.getMessageProperties().setCorrelationId(correlationId);
                    return m;
                });
            }

            if (payload.containsKey("accountNumber")) {
                accountNumber = String.valueOf(payload.get("accountNumber"));
            }
            if (payload.containsKey("limit")) {
                limit = String.valueOf(payload.get("limit"));
            }

            log.info("Auth criado correlationId={}", correlationId);
            saga.notifyGatewaySuccess(correlationId, cpf, nome, accountNumber, limit);
        } catch (Exception ex) {
            log.error("Erro ao processar auth.created: {}", ex.getMessage());
            saga.notifyGatewayFailure(correlationId, "Erro ao processar autenticação: " + ex.getMessage(), 500);
        }
    }

    /**
     * Novo Listener para receber a confirmação do Account Service
     * Configure a fila no application.properties:
     * rabbit.saga.manager.processed.queue
     */
    @RabbitListener(queues = "${rabbit.saga.manager.processed.queue:saga-manager-processed-queue}")
    public void onManagerAccountProcessed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

            String transferredAccount = getString(payload, "transferredAccount");
            String msg = getString(payload, "message");

            log.info("Processo de conta do gerente finalizado. CorrelationId={}", correlationId);
            log.info("Resultado: {} | Conta Transferida: {}", msg, transferredAccount);

            // Aqui você chama o serviço do saga para finalizar o estado, se tiver
            // persistência
            // Exemplo: saga.finalizeManagerCreation(correlationId, payload);

            // Se não tiver persistência de estado no Saga, apenas logar ou notificar o
            // Gateway
            saga.notifyGatewaySuccess(correlationId,
                    getString(payload, "cpf"),
                    getString(payload, "nome"),
                    transferredAccount != null ? transferredAccount : "",
                    "");

        } catch (Exception ex) {
            log.error("Erro ao processar resposta de manager account: {}", ex.getMessage());
        }
    }

    // Opcional: Listener de falha específico do fluxo de gerente
    @RabbitListener(queues = "${rabbit.saga.manager.account.failed.queue:saga-manager-account-failed-queue}")
    public void onManagerAccountFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String reason = getString(payload, "reason");
            log.error("Falha no processamento de conta de gerente. CorrelationId={} Reason={}", correlationId, reason);

            // Notifica erro
            saga.notifyGatewayFailure(correlationId, "Erro ao vincular contas ao gerente: " + reason, 500);
        } catch (Exception e) {
            log.error("Erro fatal listener fail manager", e);
        }
    }

    @RabbitListener(queues = "#{authFailedQueue.name}")
    public void onAuthFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Auth falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.handleAuthFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar auth.failed: {}", ex.getMessage());
            saga.handleAuthFailure(correlationId, "Erro ao processar falha da autenticação: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{authUpdatedQueue.name}")
    public void onAuthUpdated(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

            log.info("Auth atualizado correlationId={}", correlationId);
            saga.notifyUpdateSuccess(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar auth.updated: {}", ex.getMessage());
        }
    }

    @RabbitListener(queues = "#{authUpdateFailedQueue.name}")
    public void onAuthUpdateFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Auth update falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyUpdateFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar auth.update-failed: {}", ex.getMessage());
            saga.notifyUpdateFailure(correlationId, "Erro ao processar falha da atualização: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{managerDeletedQueue.name}")
    public void onManagerDeleted(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Manager deletado correlationId={}", correlationId);
            saga.handleManagerDeleted(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar manager.deleted: {}", ex.getMessage());
        }
    }

    @RabbitListener(queues = "#{authDeletedQueue.name}")
    public void onAuthDeleted(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

            log.info("Auth deletado correlationId={}", correlationId);
            saga.notifyDeleteSuccess(correlationId);
        } catch (Exception ex) {
            log.error("Erro ao processar auth.deleted: {}", ex.getMessage());
        }
    }

    @RabbitListener(queues = "#{authDeleteFailedQueue.name}")
    public void onAuthDeleteFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Auth delete falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyDeleteFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar auth.delete-failed: {}", ex.getMessage());
            saga.notifyDeleteFailure(correlationId, "Erro ao processar falha da deleção: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{clientApprovedQueue.name}")
    public void onClientApproved(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Cliente aprovado correlationId={}", correlationId);
            saga.handleClientApproved(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar client.approved: {}", ex.getMessage());
            saga.notifyApproveClientFailure(correlationId, "Erro ao processar aprovação: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{clientApproveFailedQueue.name}")
    public void onClientApproveFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Client approve falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyApproveClientFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar client.approve-failed: {}", ex.getMessage());
            saga.notifyApproveClientFailure(correlationId, "Erro ao processar falha: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{managerAssignedQueue.name}")
    public void onManagerAssigned(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Gerente atribuído correlationId={}", correlationId);
            saga.handleManagerAssigned(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar manager.assigned: {}", ex.getMessage());
            saga.notifyApproveClientFailure(correlationId, "Erro ao atribuir gerente: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{managerAssignFailedQueue.name}")
    public void onManagerAssignFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Manager assign falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyApproveClientFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar manager.assign-failed: {}", ex.getMessage());
            saga.notifyApproveClientFailure(correlationId, "Erro ao processar falha: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{accountCreatedForApprovalQueue.name}")
    public void onAccountCreatedForApproval(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Conta criada correlationId={} e payload={}", correlationId, payload);

            String accountNumber = getString(payload, "accountNumber");
            log.info("Account number extracted: {}", accountNumber);
            if (accountNumber != null) {
                saga.handleAccountCreated(correlationId, payload);
            } else {
                saga.notifyApproveClientSuccess(correlationId, payload);
            }
        } catch (Exception ex) {
            log.error("Erro ao processar saga.account.created: {}", ex.getMessage());
            saga.notifyApproveClientFailure(correlationId, "Erro ao processar conta criada: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{accountCreateFailedForApprovalQueue.name}")
    public void onAccountCreateFailedForApproval(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Account create falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyApproveClientFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar saga.account.create-failed: {}", ex.getMessage());
            saga.notifyApproveClientFailure(correlationId, "Erro ao processar falha: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{clientUpdatedQueue.name}")
    public void onClientUpdated(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Cliente atualizado correlationId={}", correlationId);
            saga.handleClientUpdated(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar client.updated: {}", ex.getMessage());
            saga.notifyUpdateClientFailure(correlationId, "Erro ao processar atualização: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{clientUpdateFailedQueue.name}")
    public void onClientUpdateFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Client update falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyUpdateClientFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar client.update-failed: {}", ex.getMessage());
            saga.notifyUpdateClientFailure(correlationId, "Erro ao processar falha: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{accountLimitUpdatedQueue.name}")
    public void onAccountLimitUpdated(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            log.info("Limite de conta atualizado correlationId={}", correlationId);
            saga.handleAccountLimitUpdated(correlationId, payload);
        } catch (Exception ex) {
            log.error("Erro ao processar account.limit-updated: {}", ex.getMessage());
            saga.notifyUpdateClientFailure(correlationId, "Erro ao processar limite atualizado: " + ex.getMessage(),
                    500);
        }
    }

    @RabbitListener(queues = "#{accountLimitUpdateFailedQueue.name}")
    public void onAccountLimitUpdateFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = getErrorMessage(payload);
            int status = getStatusCode(payload);

            log.warn("Account limit update falhou correlationId={} erro={} status={}", correlationId, error, status);
            saga.notifyUpdateClientFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Erro ao processar account.limit-update-failed: {}", ex.getMessage());
            saga.notifyUpdateClientFailure(correlationId, "Erro ao processar falha: " + ex.getMessage(), 500);
        }
    }

    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    private String getErrorMessage(Map<String, Object> payload) {
        if (payload.containsKey("reason"))
            return String.valueOf(payload.get("reason"));
        if (payload.containsKey("error"))
            return String.valueOf(payload.get("error"));
        if (payload.containsKey("message"))
            return String.valueOf(payload.get("message"));
        return "Erro desconhecido";
    }

    private int getStatusCode(Map<String, Object> payload) {
        try {
            if (payload.containsKey("statusCode")) {
                return Integer.parseInt(String.valueOf(payload.get("statusCode")));
            }
            if (payload.containsKey("status")) {
                return Integer.parseInt(String.valueOf(payload.get("status")));
            }
        } catch (Exception ignore) {
        }
        return 400;
    }
}
