package br.ufpr.saga_orchestrator.consumer;

import org.springframework.stereotype.Component;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.core.Message;

import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.ufpr.saga_orchestrator.service.SagaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class SagaListener {

    private static final Logger log = LoggerFactory.getLogger(SagaListener.class);

    private final SagaService saga;
    private final ObjectMapper mapper;

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
            
            log.info("Auth criado correlationId={}", correlationId);
            saga.notifyGatewaySuccess(correlationId, cpf, nome);
        } catch (Exception ex) {
            log.error("Erro ao processar auth.created: {}", ex.getMessage());
            saga.notifyGatewayFailure(correlationId, "Erro ao processar autenticação: " + ex.getMessage(), 500);
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
            saga.notifyUpdateSuccess(correlationId);
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

    private String getString(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value != null ? String.valueOf(value) : null;
    }

    private String getErrorMessage(Map<String, Object> payload) {
        if (payload.containsKey("reason")) return String.valueOf(payload.get("reason"));
        if (payload.containsKey("error")) return String.valueOf(payload.get("error"));
        if (payload.containsKey("message")) return String.valueOf(payload.get("message"));
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
        } catch (Exception ignore) {}
        return 400;
    }
}
