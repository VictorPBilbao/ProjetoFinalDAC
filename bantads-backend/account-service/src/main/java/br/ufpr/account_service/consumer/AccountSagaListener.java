package br.ufpr.account_service.consumer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.ufpr.account_service.config.RabbitConfig;
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.repository.AccountRepository;
import br.ufpr.account_service.service.AccountService;

@Component
public class AccountSagaListener {

    @Autowired
    private RabbitTemplate rabbitTemplate;
    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private AccountService accountService;
    @Autowired
    private ObjectMapper mapper;
    @Autowired
    private RabbitConfig rabbitConfig;

    @Value("${rabbit.saga.exchange:saga.exchange}")
    private String sagaExchange;

    @RabbitListener(queues = "${rabbit.account.create.queue}")
    public void handleCreateAccount(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

        try {
            String clientId = (String) payload.get("clientId");
            BigDecimal salary = parseBigDecimal(payload.get("salary"));
            if (salary == null) {
                throw new IllegalArgumentException("Salary ausente ou inválido: " + payload.get("salary"));
            }
            String managerId = (String) payload.get("managerId");

            System.out.println("handleCreateAccount payload salary=" + salary + " clientId=" + clientId + " managerId="
                    + managerId);

            if (accountRepository.findByClientId(clientId).isPresent()) {
                throw new IllegalStateException("Cliente já possui uma conta.");
            }

            BigDecimal limit = BigDecimal.ZERO;
            if (salary.compareTo(new BigDecimal("2000.00")) >= 0) {
                limit = salary.divide(new BigDecimal("2"), 2, java.math.RoundingMode.HALF_UP);
            }

            String accountNumber = String.format("%04d", new Random().nextInt(10000));

            Account account = new Account();
            account.setClientId(clientId);
            account.setAccountNumber(accountNumber);
            account.setCreationDate(LocalDateTime.now());
            account.setBalance(BigDecimal.ZERO);
            account.setAccountLimit(limit);
            account.setManager(managerId);

            Account savedAccount = accountRepository.save(account);

            Map<String, Object> accountData = Map.of(
                    "accountNumber", savedAccount.getAccountNumber(),
                    "clientId", savedAccount.getClientId(),
                    "managerId", savedAccount.getManager(),
                    "balance", savedAccount.getBalance(),
                    "limit", savedAccount.getAccountLimit(),
                    "creationDate", savedAccount.getCreationDate().toString());

            System.out.println("Account created successfully: " + accountData);

            rabbitTemplate.convertAndSend(sagaExchange, rabbitConfig.getAccountCreatedKey(), accountData, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
            Map<String, Object> cqrsEvent = Map.of(
                    "clientCpf", savedAccount.getClientId(),
                    "numero", savedAccount.getAccountNumber(),
                    "saldo", savedAccount.getBalance(),
                    "limite", savedAccount.getAccountLimit(),
                    "managerCpf", savedAccount.getManager(),
                    "dataCriacao", savedAccount.getCreationDate());
            accountService.publishCqrsEvent("account.created", cqrsEvent);

        } catch (Exception ex) {
            rabbitTemplate.convertAndSend(sagaExchange, rabbitConfig.getAccountCreateFailedKey(),
                    Map.of("reason", ex.getMessage(), "payload", payload), m -> {
                        m.getMessageProperties().setCorrelationId(correlationId);
                        return m;
                    });
        }
    }

    @RabbitListener(queues = "${rabbit.account.updatelimit.queue}")
    public void handleUpdateLimit(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

        try {
            String clientId = (String) payload.get("clientId");

            // Uso do método parseBigDecimal para evitar erro de conversão
            BigDecimal newSalary = parseBigDecimal(payload.get("newSalary"));

            if (newSalary == null) {
                throw new IllegalArgumentException("Novo salário inválido ou nulo");
            }

            Account updatedAccount = accountService.updateLimitByClientId(clientId, newSalary);

            Map<String, Object> response = new HashMap<>();
            response.put("clientId", updatedAccount.getClientId());
            response.put("accountNumber", updatedAccount.getAccountNumber());
            response.put("balance", updatedAccount.getBalance());
            response.put("limit", updatedAccount.getAccountLimit());
            response.put("managerId", updatedAccount.getManager());

            rabbitTemplate.convertAndSend(sagaExchange, rabbitConfig.getAccountLimitUpdatedKey(), response, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
            accountService.publishCqrsEvent("account.updated", updatedAccount);

        } catch (Exception ex) {
            System.err.println("Erro ao atualizar limite: " + ex.getMessage());
            rabbitTemplate.convertAndSend(sagaExchange, rabbitConfig.getAccountLimitUpdateFailedKey(),
                    Map.of("reason", ex.getMessage(), "payload", payload), m -> {
                        m.getMessageProperties().setCorrelationId(correlationId);
                        return m;
                    });
        }
    }

    @RabbitListener(queues = "${rabbit.account.manager.created.queue}")
    public void handleManagerCreated(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

        try {
            String newManagerCpf = (String) payload.get("cpf");
            System.out.println("Processando novo gerente no Account Service: " + newManagerCpf);

            // 1. Lógica de Negócio
            Account updatedAccount = accountService.reassignAccountToNewManager(newManagerCpf);

            // Monta o payload de resposta para o Saga
            // Clonamos o payload original para manter dados como nome/cpf e adicionamos o
            // resultado
            Map<String, Object> responsePayload = new java.util.HashMap<>(payload);

            if (updatedAccount != null) {
                System.out.println("Conta " + updatedAccount.getAccountNumber() + " transferida.");

                // Atualiza CQRS
                Map<String, Object> cqrsEvent = Map.of(
                        "clientCpf", updatedAccount.getClientId(),
                        "numero", updatedAccount.getAccountNumber(),
                        "saldo", updatedAccount.getBalance(),
                        "limite", updatedAccount.getAccountLimit(),
                        "managerCpf", updatedAccount.getManager(),
                        "dataCriacao", updatedAccount.getCreationDate().toString());
                accountService.publishCqrsEvent("account.updated", cqrsEvent);

                // Adiciona info da conta transferida para o Saga saber
                responsePayload.put("transferredAccount", updatedAccount.getAccountNumber());
                responsePayload.put("message", "Gerente assumiu conta existente com sucesso.");
            } else {
                System.out.println("Nenhuma conta transferida.");
                responsePayload.put("transferredAccount", null);
                responsePayload.put("message", "Gerente criado sem contas iniciais.");
            }

            // 2. VOLTA PARA O SAGA
            // Use uma routing key que o Saga vai escutar, ex:
            // "saga.manager.account.processed"
            rabbitTemplate.convertAndSend(sagaExchange, "saga.manager.account.processed", responsePayload, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });

        } catch (Exception ex) {
            System.err.println("Erro ao processar criação de gerente: " + ex.getMessage());

            // Opcional: Enviar falha para o Saga se isso for crítico
            rabbitTemplate.convertAndSend(sagaExchange, "saga.manager.account.failed",
                    Map.of("reason", ex.getMessage(), "payload", payload), m -> {
                        m.getMessageProperties().setCorrelationId(correlationId);
                        return m;
                    });
        }
    }

    private BigDecimal parseBigDecimal(Object value) {
        if (value == null)
            return null;
        if (value instanceof BigDecimal)
            return (BigDecimal) value;
        if (value instanceof Number) {
            return BigDecimal.valueOf(((Number) value).doubleValue());
        }
        String s = value.toString().trim();
        if (s.isEmpty())
            return null;
        s = s.replace(",", ".");
        try {
            return new BigDecimal(s);
        } catch (Exception e) {
            return null;
        }
    }
}