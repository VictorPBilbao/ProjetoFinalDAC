// ...existing code...
package br.ufpr.saga_orchestrator.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.fasterxml.jackson.databind.ObjectMapper;

@Configuration
public class RabbitConfig {

    @Bean
    public Jackson2JsonMessageConverter jsonConverter(ObjectMapper mapper) {
        return new Jackson2JsonMessageConverter(mapper);
    }

    // Manager Exchange e Queues
    @Bean
    public TopicExchange managersExchange(@Value("${rabbit.managers.exchange:managers.exchange}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public Queue managerCreatedQueue() {
        return new Queue("manager.created.queue", true);
    }

    @Bean
    public Queue managerFailedQueue() {
        return new Queue("manager.failed.queue", true);
    }

    @Bean
    public Queue managerUpdatedQueue() {
        return new Queue("manager.updated.queue", true);
    }

    @Bean
    public Queue managerDeletedQueue() {
        return new Queue("manager.deleted.queue", true);
    }

    @Bean
    public Binding bindManagerCreated(Queue managerCreatedQueue, TopicExchange managersExchange,
            @Value("${rabbit.managers.created-key:manager.created}") String key) {
        return BindingBuilder.bind(managerCreatedQueue).to(managersExchange).with(key);
    }

    @Bean
    public Binding bindManagerFailed(Queue managerFailedQueue, TopicExchange managersExchange,
            @Value("${rabbit.managers.failed-key:manager.failed}") String key) {
        return BindingBuilder.bind(managerFailedQueue).to(managersExchange).with(key);
    }

    @Bean
    public Binding bindManagerUpdated(Queue managerUpdatedQueue, TopicExchange managersExchange,
            @Value("${rabbit.managers.updated-key:manager.updated}") String key) {
        return BindingBuilder.bind(managerUpdatedQueue).to(managersExchange).with(key);
    }

    @Bean
    public Binding bindManagerDeleted(Queue managerDeletedQueue, TopicExchange managersExchange,
            @Value("${rabbit.managers.deleted-key:manager.deleted}") String key) {
        return BindingBuilder.bind(managerDeletedQueue).to(managersExchange).with(key);
    }

    // Auth Exchange e Queues
    @Bean
    public TopicExchange authExchange(@Value("${rabbit.auth.exchange:auth.exchange}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public Queue authCreatedQueue() {
        return new Queue("auth.created.queue", true);
    }

    @Bean
    public Queue authFailedQueue() {
        return new Queue("auth.failed.queue", true);
    }

    @Bean
    public Queue authUpdatedQueue() {
        return new Queue("auth.updated.queue", true);
    }

    @Bean
    public Queue authUpdateFailedQueue() {
        return new Queue("auth.update-failed.queue", true);
    }

    @Bean
    public Queue authDeletedQueue() {
        return new Queue("auth.deleted.queue", true);
    }

    @Bean
    public Queue authDeleteFailedQueue() {
        return new Queue("auth.delete-failed.queue", true);
    }

    @Bean
    public Binding bindAuthCreated(Queue authCreatedQueue, TopicExchange authExchange,
            @Value("${rabbit.auth.created-key:auth.created-user}") String key) {
        return BindingBuilder.bind(authCreatedQueue).to(authExchange).with(key);
    }

    @Bean
    public Binding bindAuthFailed(Queue authFailedQueue, TopicExchange authExchange,
            @Value("${rabbit.auth.failed-key:auth.create-failed}") String key) {
        return BindingBuilder.bind(authFailedQueue).to(authExchange).with(key);
    }

    @Bean
    public Binding bindAuthUpdated(Queue authUpdatedQueue, TopicExchange authExchange,
            @Value("${rabbit.auth.updated-key:auth.updated-user}") String key) {
        return BindingBuilder.bind(authUpdatedQueue).to(authExchange).with(key);
    }

    @Bean
    public Binding bindAuthUpdateFailed(Queue authUpdateFailedQueue, TopicExchange authExchange,
            @Value("${rabbit.auth.update-failed-key:auth.update-failed}") String key) {
        return BindingBuilder.bind(authUpdateFailedQueue).to(authExchange).with(key);
    }

    @Bean
    public Binding bindAuthDeleted(Queue authDeletedQueue, TopicExchange authExchange,
            @Value("${rabbit.auth.deleted-key:auth.deleted-user}") String key) {
        return BindingBuilder.bind(authDeletedQueue).to(authExchange).with(key);
    }

    @Bean
    public Binding bindAuthDeleteFailed(Queue authDeleteFailedQueue, TopicExchange authExchange,
            @Value("${rabbit.auth.delete-failed-key:auth.delete-failed}") String key) {
        return BindingBuilder.bind(authDeleteFailedQueue).to(authExchange).with(key);
    }

    @Bean
    public TopicExchange clientsExchange(@Value("${rabbit.clients.exchange:clients.exchange}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public Queue clientApprovedQueue() {
        return new Queue("client.approved.queue", true);
    }

    @Bean
    public Queue clientApproveFailedQueue() {
        return new Queue("client.approve-failed.queue", true);
    }

    @Bean
    public Binding bindClientApproved(Queue clientApprovedQueue, TopicExchange clientsExchange,
            @Value("${rabbit.clients.approved-key:client.approved}") String key) {
        return BindingBuilder.bind(clientApprovedQueue).to(clientsExchange).with(key);
    }

    @Bean
    public Binding bindClientApproveFailed(Queue clientApproveFailedQueue, TopicExchange clientsExchange,
            @Value("${rabbit.clients.approve-failed-key:client.approve-failed}") String key) {
        return BindingBuilder.bind(clientApproveFailedQueue).to(clientsExchange).with(key);
    }

    @Bean
    public Queue managerAssignedQueue() {
        return new Queue("manager.assigned.queue", true);
    }

    @Bean
    public Queue managerAssignFailedQueue() {
        return new Queue("manager.assign-failed.queue", true);
    }

    @Bean
    public Binding bindManagerAssigned(Queue managerAssignedQueue, TopicExchange managersExchange,
            @Value("${rabbit.managers.assigned-key:manager.assigned}") String key) {
        return BindingBuilder.bind(managerAssignedQueue).to(managersExchange).with(key);
    }

    @Bean
    public Binding bindManagerAssignFailed(Queue managerAssignFailedQueue, TopicExchange managersExchange,
            @Value("${rabbit.managers.assign-failed-key:manager.assign-failed}") String key) {
        return BindingBuilder.bind(managerAssignFailedQueue).to(managersExchange).with(key);
    }

    @Bean
    public TopicExchange sagaExchange(@Value("${rabbit.saga.exchange:saga.exchange}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public Queue accountCreatedForApprovalQueue() {
        return new Queue("saga.account.created.queue", true);
    }

    @Bean
    public Queue accountCreateFailedForApprovalQueue() {
        return new Queue("saga.account.create-failed.queue", true);
    }

    @Bean
    public Binding bindAccountCreatedForApproval(Queue accountCreatedForApprovalQueue, TopicExchange sagaExchange,
            @Value("${rabbit.account.created-key:saga.account.created}") String key) {
        return BindingBuilder.bind(accountCreatedForApprovalQueue).to(sagaExchange).with(key);
    }

    @Bean
    public Binding bindAccountCreateFailedForApproval(Queue accountCreateFailedForApprovalQueue,
            TopicExchange sagaExchange,
            @Value("${rabbit.account.create-failed-key:saga.account.create-failed}") String key) {
        return BindingBuilder.bind(accountCreateFailedForApprovalQueue).to(sagaExchange).with(key);
    }
}