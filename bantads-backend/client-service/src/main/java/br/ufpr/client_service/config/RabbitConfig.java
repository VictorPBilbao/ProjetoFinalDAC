package br.ufpr.client_service.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
public class RabbitConfig {

    @Value("${rabbit.clients.exchange:clients.exchange}")
    private String clientsExchange;

    @Value("${rabbit.clients.approve-queue:client.approve.queue}")
    private String approveQueue;

    @Value("${rabbit.clients.approve-key:client.approve}")
    private String approveKey;

    @Value("${rabbit.auth.exchange:auth.exchange}")
    private String authExchange;

    @Value("${rabbit.auth.created-queue:client.auth.created.queue}")
    private String authCreatedQueue;

    @Value("${rabbit.auth.created-key:auth.created-user}")
    private String authCreatedKey;

    @Bean
    public TopicExchange clientsExchange() {
        return new TopicExchange(clientsExchange, true, false);
    }

    @Bean
    public TopicExchange authExchange() {
        return new TopicExchange(authExchange, true, false);
    }

    @Bean
    public Queue clientApproveQueue() {
        return QueueBuilder.durable(approveQueue).build();
    }

    @Bean
    public Queue authCreatedQueue() {
        return QueueBuilder.durable(authCreatedQueue).build();
    }

    @Bean
    public Binding bindApprove(Queue clientApproveQueue, TopicExchange clientsExchange) {
        return BindingBuilder.bind(clientApproveQueue).to(clientsExchange).with(approveKey);
    }

    @Bean
    public Binding bindAuthCreated(Queue authCreatedQueue, TopicExchange authExchange) {
        return BindingBuilder.bind(authCreatedQueue).to(authExchange).with(authCreatedKey);
    }

    @Bean
    public Jackson2JsonMessageConverter jsonConverter(ObjectMapper mapper) {
        return new Jackson2JsonMessageConverter(mapper);
    }
}
