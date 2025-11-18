package br.ufpr.auth_service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class RabbitConfig {

    @Value("${rabbit.auth.exchange:auth.exchange}") private String authExchange;
    @Value("${rabbit.auth.create-key:auth.create-user}") private String createKey;
    @Value("${rabbit.auth.create-queue:auth.create.queue}") private String createQueue;
    @Value("${rabbit.auth.update-key:auth.update-user}") private String updateKey;
    @Value("${rabbit.auth.update-queue:auth.update.queue}") private String updateQueue;

    @Bean
    public TopicExchange authExchange() {
        return new TopicExchange(authExchange, true, false);
    }

    @Bean
    public Queue authCreateQueue() {
        return QueueBuilder.durable(createQueue).build();
    }

    @Bean
    public Queue authUpdateQueue() {
        return QueueBuilder.durable(updateQueue).build();
    }

    @Bean
    public Binding bindAuthCreate(Queue authCreateQueue, TopicExchange authExchange) {
        return BindingBuilder.bind(authCreateQueue).to(authExchange).with(createKey);
    }

    @Bean
    public Binding bindAuthUpdate(Queue authUpdateQueue, TopicExchange authExchange) {
        return BindingBuilder.bind(authUpdateQueue).to(authExchange).with(updateKey);
    }

    @Bean
    public Jackson2JsonMessageConverter jsonConverter(ObjectMapper mapper) {
        return new Jackson2JsonMessageConverter(mapper);
    }
}