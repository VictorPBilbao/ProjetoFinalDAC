package br.ufpr.client_service.consumer;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.ufpr.client_service.model.Client;
import br.ufpr.client_service.repository.ClientRepository;
import br.ufpr.client_service.service.ClientService;
import br.ufpr.client_service.service.EmailService;

@Component
public class ClientSagaListener {

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Autowired
    private ClientRepository clientRepository;

    @Autowired
    private ClientService clientService; // Injetar o Service

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private EmailService emailService;

    @Value("${rabbit.clients.exchange:clients.exchange}")
    private String clientsExchange;

    @RabbitListener(queues = "${rabbit.clients.approve-queue:client.approve.queue}")
    public void handleApproveClient(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

        try {
            String cpf = (String) payload.get("cpf");

            Client client = clientRepository.findById(cpf)
                    .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));

            if (Boolean.TRUE.equals(client.getAprovado())) {
                throw new IllegalStateException("Cliente já aprovado");
            }

            client.setAprovado(true);
            clientRepository.save(client);

            Map<String, Object> response = new HashMap<>();
            response.put("cpf", client.getCpf());
            response.put("nome", client.getNome());
            response.put("email", client.getEmail());
            response.put("salario", client.getSalario());

            rabbitTemplate.convertAndSend(clientsExchange, "client.approved", response, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });

        } catch (Exception ex) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("reason", ex.getMessage());
            errorResponse.put("payload", payload);

            rabbitTemplate.convertAndSend(clientsExchange, "client.approve-failed", errorResponse, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
        }
    }

    @RabbitListener(queues = "${rabbit.auth.created-queue:client.auth.created.queue}")
    public void handleAuthCreated(Message message) throws Exception {
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

        try {
            String nome = (String) payload.get("nome");
            String email = (String) payload.get("email");
            String cpf = (String) payload.get("cpf"); // Extrair CPF
            String passwordGenerated = (String) payload.get("passwordGenerated");
            String accountNumber = (String) payload.get("accountNumber");

            // Se houver número de conta e CPF, atualiza o cliente
            if (cpf != null && accountNumber != null) {
                clientService.updateClientAccount(cpf, accountNumber);
            }

            // Only send email if password was generated (approval case)
            if (passwordGenerated != null && !passwordGenerated.isEmpty()) {
                String accountInfo = accountNumber != null ? accountNumber : "consultar no sistema";
                emailService.sendApprovalEmail(email, nome, accountInfo, passwordGenerated);
                System.out.println("Email de aprovação enviado para: " + email + " com conta: " + accountInfo);
            }
        } catch (Exception ex) {
            System.err.println("Erro ao processar criação de auth/conta: " + ex.getMessage());
            ex.printStackTrace();
        }
    }

    @RabbitListener(queues = "${rabbit.clients.update-queue:client.update.queue}")
    public void handleUpdateClient(Message message) throws Exception {
        String correlationId = message.getMessageProperties().getCorrelationId();
        Map<String, Object> payload = mapper.readValue(message.getBody(), Map.class);

        try {
            String cpf = (String) payload.get("cpf");

            Client client = clientRepository.findById(cpf)
                    .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));

            Object oldSalario = client.getSalario();

            if (payload.containsKey("nome")) {
                client.setNome((String) payload.get("nome"));
            }
            if (payload.containsKey("email")) {
                client.setEmail((String) payload.get("email"));
            }
            if (payload.containsKey("telefone")) {
                client.setTelefone((String) payload.get("telefone"));
            }
            if (payload.containsKey("salario")) {
                Object salarioObj = payload.get("salario");
                if (salarioObj instanceof Number) {
                    client.setSalario(BigDecimal.valueOf(((Number) salarioObj).doubleValue()));
                }
            }
            if (payload.containsKey("endereco")) {
                client.setEndereco((String) payload.get("endereco"));
            }
            if (payload.containsKey("cep")) {
                client.setCep((String) payload.get("cep"));
            }
            if (payload.containsKey("cidade")) {
                client.setCidade((String) payload.get("cidade"));
            }
            if (payload.containsKey("estado")) {
                client.setEstado((String) payload.get("estado"));
            }

            clientRepository.save(client);

            Map<String, Object> response = new HashMap<>();
            response.put("cpf", client.getCpf());
            response.put("nome", client.getNome());
            response.put("email", client.getEmail());
            response.put("salario", client.getSalario());
            response.put("oldSalario", oldSalario);

            rabbitTemplate.convertAndSend(clientsExchange, "client.updated", response, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });

        } catch (Exception ex) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("reason", ex.getMessage());
            errorResponse.put("payload", payload);

            rabbitTemplate.convertAndSend(clientsExchange, "client.update-failed", errorResponse, m -> {
                m.getMessageProperties().setCorrelationId(correlationId);
                return m;
            });
        }
    }
}