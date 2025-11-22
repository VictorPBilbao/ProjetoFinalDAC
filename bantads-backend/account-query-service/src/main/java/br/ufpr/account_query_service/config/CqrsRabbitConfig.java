package br.ufpr.account_query_service.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CqrsRabbitConfig {

    @Value("${rabbit.account.events.exchange:account.events.exchange}")
    private String accountEventsExchange;

    @Value("${rabbit.account.events.queue:account.events.query.queue}")
    private String eventsQueue;

    @Value("${rabbit.account.update.queue:account-update-queue}")
    private String accountUpdateQueue;

    @Value("${rabbit.transaction.created.queue:transaction-created-queue}")
    private String transactionCreatedQueue;

    @Value("${rabbit.account.update.key:account.updated}")
    private String accountUpdateKey;

    @Value("${rabbit.transaction.created.key:transaction.created}")
    private String transactionCreatedKey;

    @Bean
    public TopicExchange accountEventsExchange() {
        return new TopicExchange(accountEventsExchange, true, false);
    }

    @Bean
    public Queue eventsQueue() {
        return QueueBuilder.durable(eventsQueue).build();
    }

    @Bean
    public Queue accountUpdateQueue() {
        return QueueBuilder.durable(accountUpdateQueue).build();
    }

    @Bean
    public Queue transactionCreatedQueue() {
        return QueueBuilder.durable(transactionCreatedQueue).build();
    }

    @Bean
    public Binding bindEvents(Queue eventsQueue, TopicExchange accountEventsExchange) {
        return BindingBuilder.bind(eventsQueue).to(accountEventsExchange).with("#");
    }

    @Bean
    public Binding bindAccountUpdate(Queue accountUpdateQueue, TopicExchange accountEventsExchange) {
        // CORREÇÃO CRÍTICA: Usar "account.#" para capturar "account.updated" e "account.created"
        return BindingBuilder.bind(accountUpdateQueue).to(accountEventsExchange).with("account.#");
    }

    @Bean
    public Binding bindTransactionCreated(Queue transactionCreatedQueue, TopicExchange accountEventsExchange) {
        // CORREÇÃO: Fixar "transaction.created" para garantir match exato com o produtor
        return BindingBuilder.bind(transactionCreatedQueue).to(accountEventsExchange).with("transaction.created");
    }
}
