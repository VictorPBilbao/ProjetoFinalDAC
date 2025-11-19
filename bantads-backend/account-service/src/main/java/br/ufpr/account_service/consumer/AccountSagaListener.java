package br.ufpr.account_service.consumer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
            BigDecimal salary = new BigDecimal(payload.get("salary").toString());
            String managerId = (String) payload.get("managerId");

            if (accountRepository.findByClientId(clientId).isPresent()) {
                throw new IllegalStateException("Cliente já possui uma conta.");
            }

            BigDecimal limit = BigDecimal.ZERO;
            if (salary.compareTo(new BigDecimal("2000.00")) >= 0) {
                limit = salary.divide(new BigDecimal(2));
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

            rabbitTemplate.convertAndSend(sagaExchange, rabbitConfig.getAccountCreatedKey(), accountData, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });

            accountService.publishCqrsEvent("account.created", savedAccount);

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
            BigDecimal newSalary = new BigDecimal(payload.get("newSalary").toString());

            Account updatedAccount = accountService.updateLimitByClientId(clientId, newSalary);

            rabbitTemplate.convertAndSend(sagaExchange, rabbitConfig.getAccountLimitUpdatedKey(), updatedAccount, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });

        } catch (Exception ex) {

            rabbitTemplate.convertAndSend(sagaExchange, rabbitConfig.getAccountLimitUpdateFailedKey(),
                    Map.of("reason", ex.getMessage(), "payload", payload), m -> {
                        m.getMessageProperties().setCorrelationId(correlationId);
                        return m;
                    });
        }
    }
}
