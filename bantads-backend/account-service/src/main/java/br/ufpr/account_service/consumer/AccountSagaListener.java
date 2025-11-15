package br.ufpr.account_service.consumer;

import br.ufpr.account_service.config.RabbitConfig;
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.repository.AccountRepository;
import br.ufpr.account_service.service.AccountService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

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
            account.setLimit(limit);
            account.setManager(managerId);

            Account savedAccount = accountRepository.save(account);

            rabbitTemplate.convertAndSend(sagaExchange, RabbitConfig.ACCOUNT_CREATED_KEY, savedAccount, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });

            accountService.publishCqrsEvent("account.created", savedAccount);

        } catch (Exception ex) {
            rabbitTemplate.convertAndSend(sagaExchange, RabbitConfig.ACCOUNT_CREATE_FAILED_KEY,
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

            rabbitTemplate.convertAndSend(sagaExchange, RabbitConfig.ACCOUNT_LIMIT_UPDATED_KEY, updatedAccount, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });

        } catch (Exception ex) {

            rabbitTemplate.convertAndSend(sagaExchange, RabbitConfig.ACCOUNT_LIMIT_UPDATE_FAILED_KEY,
                    Map.of("reason", ex.getMessage(), "payload", payload), m -> {
                        m.getMessageProperties().setCorrelationId(correlationId);
                        return m;
                    });
        }
    }
}