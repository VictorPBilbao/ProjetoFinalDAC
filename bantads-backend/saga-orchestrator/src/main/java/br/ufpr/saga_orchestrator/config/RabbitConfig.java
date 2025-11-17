// ...existing code...
package br.ufpr.saga_orchestrator.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.ApplicationRunner;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;

// ADDED IMPORTS
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;

@Configuration
public class RabbitConfig {

    @Value("${rabbit.managers.exchange:managers.exchange}")
    private String managersExchange;

    @Value("${rabbit.auth.exchange:auth.exchange}")
    private String authExchange;

    @Bean
    public TopicExchange managersExchange() {
        return new TopicExchange(managersExchange, true, false);
    }

    @Bean
    public TopicExchange authExchange() {
        return new TopicExchange(authExchange, true, false);
    }

    @Bean
    public RabbitAdmin rabbitAdmin(ConnectionFactory cf) {
        return new RabbitAdmin(cf);
    }

    @Bean
    public ApplicationRunner declareExchanges(RabbitAdmin admin, TopicExchange managersExchange, TopicExchange authExchange) {
        return args -> {
            admin.declareExchange(managersExchange);
            admin.declareExchange(authExchange);
        };
    }
    
    @Bean
    public Jackson2JsonMessageConverter jsonConverter(ObjectMapper mapper) {
        return new Jackson2JsonMessageConverter(mapper);
    }

    // Queues + bindings para ouvir eventos de manager (created/failed)
    @Value("${rabbit.managers.created-key:manager.created}")
    private String managersCreatedKey;

    @Value("${rabbit.managers.failed-key:manager.failed}")
    private String managersFailedKey;

    @Bean
    public Queue managerCreatedQueue() {
        return new Queue("manager.created.queue");
    }

    @Bean
    public Queue managerFailedQueue() {
        return new Queue("manager.failed.queue");
    }

    @Bean
    public Binding bindManagerCreated(Queue managerCreatedQueue, TopicExchange managersExchange) {
        return BindingBuilder.bind(managerCreatedQueue).to(managersExchange).with(managersCreatedKey);
    }

    @Bean
    public Binding bindManagerFailed(Queue managerFailedQueue, TopicExchange managersExchange) {
        return BindingBuilder.bind(managerFailedQueue).to(managersExchange).with(managersFailedKey);
    }

    // Queues + bindings para ouvir eventos de auth (created/failed)
    @Value("${rabbit.auth.created-key:auth.created-user}")
    private String authCreatedKey;

    @Value("${rabbit.auth.failed-key:auth.create-failed}")
    private String authFailedKey;

    @Bean
    public Queue authCreatedQueue() {
        return new Queue("auth.created.queue");
    }

    @Bean
    public Queue authFailedQueue() {
        return new Queue("auth.failed.queue");
    }

    @Bean
    public Binding bindAuthCreated(Queue authCreatedQueue, TopicExchange authExchange) {
        return BindingBuilder.bind(authCreatedQueue).to(authExchange).with(authCreatedKey);
    }

    @Bean
    public Binding bindAuthFailed(Queue authFailedQueue, TopicExchange authExchange) {
        return BindingBuilder.bind(authFailedQueue).to(authExchange).with(authFailedKey);
    }
}