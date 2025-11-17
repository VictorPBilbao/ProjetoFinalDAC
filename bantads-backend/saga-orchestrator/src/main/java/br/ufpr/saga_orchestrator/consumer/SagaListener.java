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
            log.info("SagaListener received manager.created correlationId={} payload={}", correlationId, payload);
            saga.handleManagerCreated(correlationId, payload);
        } catch (Exception ex) {
            log.error("Error reading manager.created message", ex);
            saga.notifyGatewayFailure(correlationId, "Error reading manager.created payload: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{managerFailedQueue.name}")
    public void onManagerFailure(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = payload.containsKey("reason") ? String.valueOf(payload.get("reason"))
                    : (payload.containsKey("error") ? String.valueOf(payload.get("error")) : "manager.failed");
            int status = 400;
            if (payload.containsKey("status")) {
                try { status = Integer.parseInt(String.valueOf(payload.get("status"))); } catch (Exception ignore) {}
            } else if (payload.containsKey("statusCode")) {
                try { status = Integer.parseInt(String.valueOf(payload.get("statusCode"))); } catch (Exception ignore) {}
            }
            log.warn("SagaListener manager.failed correlationId={} error={} status={}", correlationId, error, status);
            saga.notifyGatewayFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Error reading manager.failed message", ex);
            saga.notifyGatewayFailure(correlationId, "Error reading manager.failed payload: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{authCreatedQueue.name}")
    public void onAuthCreated(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String cpf = payload.containsKey("cpf") ? String.valueOf(payload.get("cpf")) : null;
            String nome = payload.containsKey("email") ? String.valueOf(payload.get("email")) : null;
            log.info("SagaListener auth.created correlationId={} cpf={} nome={}", correlationId, cpf, nome);
            saga.notifyGatewaySuccess(correlationId, cpf, nome);
        } catch (Exception ex) {
            log.error("Error reading auth.created message", ex);
            saga.notifyGatewayFailure(correlationId, "Error reading auth.created payload: " + ex.getMessage(), 500);
        }
    }

    @RabbitListener(queues = "#{authFailedQueue.name}")
    public void onAuthFailed(Message message) {
        String correlationId = message.getMessageProperties().getCorrelationId();
        try {
            Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);
            String error = payload.containsKey("reason") ? String.valueOf(payload.get("reason"))
                    : (payload.containsKey("error") ? String.valueOf(payload.get("error")) : "auth.failed");
            int status = 400;
            if (payload.containsKey("status")) {
                try { status = Integer.parseInt(String.valueOf(payload.get("status"))); } catch (Exception ignore) {}
            } else if (payload.containsKey("statusCode")) {
                try { status = Integer.parseInt(String.valueOf(payload.get("statusCode"))); } catch (Exception ignore) {}
            }
            log.warn("SagaListener auth.failed correlationId={} error={} status={}", correlationId, error, status);
            // ensure rollback
            saga.handleAuthFailure(correlationId, error, status);
        } catch (Exception ex) {
            log.error("Error reading auth.failed message", ex);
            saga.handleAuthFailure(correlationId, "Error reading auth.failed payload: " + ex.getMessage(), 500);
        }
    }
}
