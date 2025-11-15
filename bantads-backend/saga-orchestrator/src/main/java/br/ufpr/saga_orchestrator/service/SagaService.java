package br.ufpr.saga_orchestrator.service;

import java.util.HashMap;
import java.util.Map;
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

    /**
     * Publica eventos no RabbitMQ em vez de usar RPC.
     *
     * Observação: sem RPC não há resposta síncrona do service consumer.
     * O fluxo torna-se baseado em eventos (event-driven). Consumidores
     * devem publicar eventos de confirmação/erro para que o saga acompanhe
     * o resultado (ex.: via filas de resposta ou outro mecanismo).
     */
    public SagaResult createManagerSaga(Map<String, Object> managerDto, String authorizationHeader) {
        // gera correlationId para rastreamento entre eventos
        String correlationId = UUID.randomUUID().toString();

        try {
            // 1) publicar comando para criação do manager (consumer deve processar)
            sendEvent(managersExchange, managersCreateKey, managerDto, correlationId);
            log.info("Published manager.create event correlationId={}", correlationId);

            // 2) publicar comando para criação de usuário no auth.
            // Sem RPC não temos createdManager com id; enviamos dados disponíveis.
            String cpf = asString(managerDto, "cpf");
            String nome = asString(managerDto, "nome");
            String email = asString(managerDto, "email");
            String senha = asString(managerDto, "senha");
            Map<String, Object> authPayload = new HashMap<>();
            if (cpf != null) authPayload.put("cpf", cpf);
            if (nome != null) authPayload.put("nome", nome);
            if (email != null) authPayload.put("email", email);
            if (senha != null) authPayload.put("senha", senha);
            authPayload.put("tipo", "MANAGER");
            // inclui referência ao correlationId para rastrear o par de eventos
            authPayload.put("correlationId", correlationId);

            sendEvent(authExchange, authCreateKey, authPayload, correlationId);
            log.info("Published auth.create event correlationId={}", correlationId);

            Map<String, Object> result = new HashMap<>();
            result.put("correlationId", correlationId);
            result.put("status", "events-published");

            return new SagaResult(true, "create-manager", "Eventos publicados para criação (async)", result);
        } catch (Exception ex) {
            log.error("Falha ao publicar eventos de criação", ex);
            return new SagaResult(false, "create-manager", "Erro ao publicar eventos: " + ex.getMessage(), null);
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
            log.info("Published manager.update event correlationId={}, id={}", correlationId, managerId);

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
            log.info("Published auth.update event correlationId={}, managerId={}", correlationId, managerId);

            Map<String, Object> result = new HashMap<>();
            result.put("correlationId", correlationId);
            result.put("status", "events-published");

            return new SagaResult(true, "update-manager", "Eventos publicados para atualização (async)", result);
        } catch (Exception ex) {
            log.error("Erro ao publicar eventos de update", ex);
            return new SagaResult(false, "update-manager", "Erro ao publicar eventos: " + ex.getMessage(), null);
        }
    }

    // publica evento no exchange com routing key, adicionando correlation id no properties
    private void sendEvent(String exchange, String routingKey, Object payload, String correlationId) {
        // rely on Jackson2JsonMessageConverter bean: send object (not serialized bytes)
        log.info("Publishing event exchange={} routingKey={} correlationId={}", exchange, routingKey, correlationId);
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
}