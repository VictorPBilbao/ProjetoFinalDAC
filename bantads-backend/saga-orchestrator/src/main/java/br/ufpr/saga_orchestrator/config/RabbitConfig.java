// ...existing code...
package br.ufpr.saga_orchestrator.config;

import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitAdmin;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.boot.ApplicationRunner;

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
}
// ...existing code...