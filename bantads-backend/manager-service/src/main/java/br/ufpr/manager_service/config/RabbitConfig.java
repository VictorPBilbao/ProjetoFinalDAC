// ...existing code...
package br.ufpr.manager_service.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class RabbitConfig {

    @Value("${rabbit.managers.exchange:managers.exchange}")
    private String managersExchange;

    @Value("${rabbit.managers.create-queue:manager.create.queue}")
    private String createQueue;

    @Value("${rabbit.managers.create-key:manager.create}")
    private String createKey;

    @Value("${rabbit.managers.created-key:manager.created}")
    private String createdKey;

    @Value("${rabbit.managers.update-queue:manager.update.queue}")
    private String updateQueue;

    @Value("${rabbit.managers.update-key:manager.update}")
    private String updateKey;

    @Value("${rabbit.managers.updated-key:manager.updated}")
    private String updatedKey;

    @Value("${rabbit.managers.failed-key:manager.failed}")
    private String failedKey;

    @Value("${rabbit.managers.delete-queue:manager.delete.queue}")
    private String deleteQueue;

    @Value("${rabbit.managers.delete-key:manager.delete}")
    private String deleteKey;

    @Value("${rabbit.managers.assign-queue:manager.assign.queue}")
    private String assignQueue;

    @Value("${rabbit.managers.assign-key:manager.assign}")
    private String assignKey;

    @Bean
    public TopicExchange managersExchange() {
        return new TopicExchange(managersExchange, true, false);
    }

    @Bean
    public Queue managersCreateQueue() {
        return QueueBuilder.durable(createQueue).build();
    }

    @Bean
    public Queue managersUpdateQueue() {
        return QueueBuilder.durable(updateQueue).build();
    }

    @Bean
    public Queue managersDeleteQueue() {
        return QueueBuilder.durable(deleteQueue).build();
    }

    @Bean
    public Binding bindCreate(Queue managersCreateQueue, TopicExchange managersExchange) {
        return BindingBuilder.bind(managersCreateQueue).to(managersExchange).with(createKey);
    }

    @Bean
    public Binding bindUpdate(Queue managersUpdateQueue, TopicExchange managersExchange) {
        return BindingBuilder.bind(managersUpdateQueue).to(managersExchange).with(updateKey);
    }

    @Bean
    public Binding bindDelete(Queue managersDeleteQueue, TopicExchange managersExchange) {
        return BindingBuilder.bind(managersDeleteQueue).to(managersExchange).with(deleteKey);
    }

    @Bean
    public Queue managersAssignQueue() {
        return QueueBuilder.durable(assignQueue).build();
    }

    @Bean
    public Binding bindAssign(Queue managersAssignQueue, TopicExchange managersExchange) {
        return BindingBuilder.bind(managersAssignQueue).to(managersExchange).with(assignKey);
    }

    @Bean
    public Jackson2JsonMessageConverter jsonConverter(ObjectMapper mapper) {
        return new Jackson2JsonMessageConverter(mapper);
    }
}
// ...existing code...