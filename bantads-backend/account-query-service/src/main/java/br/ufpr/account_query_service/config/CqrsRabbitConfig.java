package main.java.br.ufpr.account_query_service.config;

import org.springframework.amqp.core.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CqrsRabbitConfig {

    @Value("${rabbit.account.events.exchange:account.events.exchange}")
    private String accountEventsExchange;

    @Value("${rabbit.account.events.queue:account.events.query.queue}")
    private String eventsQueue;

    @Bean
    public TopicExchange accountEventsExchange() {
        return new TopicExchange(accountEventsExchange, true, false);
    }

    @Bean
    public Queue eventsQueue() {
        return QueueBuilder.durable(eventsQueue).build();
    }

    @Bean
    public Binding bindEvents(Queue eventsQueue, TopicExchange accountEventsExchange) {
        return BindingBuilder.bind(eventsQueue).to(accountEventsExchange).with("#");
    }
}
