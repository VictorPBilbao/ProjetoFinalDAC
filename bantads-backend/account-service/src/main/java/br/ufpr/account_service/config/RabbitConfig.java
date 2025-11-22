package br.ufpr.account_service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitConfig {
    @Value("${rabbit.saga.exchange:saga.exchange}")
    private String sagaExchange;

    @Value("${rabbit.account.events.exchange:account.events.exchange}")
    private String accountEventsExchange;

    @Value("${rabbit.account.create.queue:account.create.queue}")
    private String createAccountQueue;
    @Value("${rabbit.account.create.key:saga.account.create}")
    private String createAccountKey;

    @Value("${rabbit.account.updatelimit.queue:account.updatelimit.queue}")
    private String updateLimitQueue;
    @Value("${rabbit.account.updatelimit.key:saga.account.updatelimit}")
    private String updateLimitKey;

    @Value("${rabbit.account.created.key:saga.account.created}")
    private String accountCreatedKey;
    @Value("${rabbit.account.create-failed.key:saga.account.create-failed}")
    private String accountCreateFailedKey;

    @Value("${rabbit.account.limit-updated.key:saga.account.limit-updated}")
    private String accountLimitUpdatedKey;
    @Value("${rabbit.account.limit-update-failed.key:saga.account.limit-update-failed}")
    private String accountLimitUpdateFailedKey;

    @Value("${rabbit.account.manager.created.queue}")
    private String accountManagerCreatedQueueName;

    @Value("${rabbit.account.manager.created.key}")
    private String accountManagerCreatedKey;

    @Bean
    public TopicExchange sagaExchange() {
        return new TopicExchange(sagaExchange, true, false);
    }

    @Bean
    public TopicExchange accountEventsExchange() {

        return new TopicExchange(accountEventsExchange, true, false);
    }

    @Bean
    public Queue createAccountQueue() {
        return QueueBuilder.durable(createAccountQueue).build();
    }

    @Bean
    public Binding bindCreateAccount(Queue createAccountQueue, TopicExchange sagaExchange) {
        return BindingBuilder.bind(createAccountQueue).to(sagaExchange).with(createAccountKey);
    }

    @Bean
    public Queue updateLimitQueue() {
        return QueueBuilder.durable(updateLimitQueue).build();
    }

    @Bean
    public Binding bindUpdateLimit(Queue updateLimitQueue, TopicExchange sagaExchange) {
        return BindingBuilder.bind(updateLimitQueue).to(sagaExchange).with(updateLimitKey);
    }

    @Bean
    public Jackson2JsonMessageConverter jsonConverter(ObjectMapper mapper) {
        return new Jackson2JsonMessageConverter(mapper);
    }

    @Bean
    public Queue accountManagerCreatedQueue() {
        return QueueBuilder.durable(accountManagerCreatedQueueName).build();
    }

    @Bean
    public Binding bindAccountManagerCreated(Queue accountManagerCreatedQueue, TopicExchange sagaExchange) {
        return BindingBuilder.bind(accountManagerCreatedQueue)
                .to(sagaExchange)
                .with(accountManagerCreatedKey);
    }


    // Getters for routing keys
    public String getAccountCreatedKey() {
        return accountCreatedKey;
    }

    public String getAccountCreateFailedKey() {
        return accountCreateFailedKey;
    }

    public String getAccountLimitUpdatedKey() {
        return accountLimitUpdatedKey;
    }

    public String getAccountLimitUpdateFailedKey() {
        return accountLimitUpdateFailedKey;
    }
}