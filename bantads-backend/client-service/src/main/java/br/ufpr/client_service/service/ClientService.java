package br.ufpr.client_service.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ufpr.client_service.model.AutocadastroRequestDTO;
import br.ufpr.client_service.model.Client;
import br.ufpr.client_service.model.ClientDTO;
import br.ufpr.client_service.repository.ClientRepository;

@Service
public class ClientService {

    private static final Logger logger = LoggerFactory.getLogger(ClientService.class);

    private final ClientRepository clientRepository;
    private final EmailService emailService;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Value("${rabbit.saga.exchange:saga.exchange}")
    private String sagaExchange;

    @Value("${rabbit.account.updatelimit.key:saga.account.updatelimit}")
    private String updateLimitKey;

    public ClientService(ClientRepository clientRepository, EmailService emailService) {
        this.clientRepository = clientRepository;
        this.emailService = emailService;
    }

    @Transactional
    public ClientDTO autocadastro(AutocadastroRequestDTO request) {
        if (clientRepository.existsById(request.getCpf())) {
            throw new IllegalArgumentException(
                    "Cliente já cadastrado ou aguardando aprovação com CPF: " + request.getCpf());
        }
        if (clientRepository.findByEmail(request.getEmail()) != null) {
            throw new IllegalArgumentException("Email já cadastrado: " + request.getEmail());
        }

        Client client = new Client();
        client.setCpf(request.getCpf());
        client.setNome(request.getNome());
        client.setEmail(request.getEmail());
        client.setTelefone(request.getTelefone());
        client.setSalario(request.getSalario());
        client.setEndereco(request.getEndereco());
        client.setCep(request.getCep());
        client.setCidade(request.getCidade());
        client.setEstado(request.getEstado());
        client.setAprovado(false);
        client.setDataCadastro(LocalDateTime.now());

        Client savedClient = clientRepository.save(client);
        return convertToDTO(savedClient);
    }

    @Transactional
    public ClientDTO updateClient(String cpf, ClientDTO updatedData) {
        Client client = clientRepository.findById(cpf)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado com CPF: " + cpf));

        BigDecimal oldSalario = client.getSalario();

        client.setNome(updatedData.getNome());
        client.setEmail(updatedData.getEmail());
        client.setTelefone(updatedData.getTelefone());
        client.setSalario(updatedData.getSalario());
        client.setEndereco(updatedData.getEndereco());
        client.setCep(updatedData.getCep());
        client.setCidade(updatedData.getCidade());
        client.setEstado(updatedData.getEstado());

        Client savedClient = clientRepository.save(client);

        if (oldSalario != null && savedClient.getSalario().compareTo(oldSalario) != 0) {
            logger.info("Salário alterado para o cliente {}. Enviando evento para atualização de limite.", cpf);
            Map<String, Object> payload = new HashMap<>();
            payload.put("clientId", savedClient.getCpf());
            payload.put("newSalary", savedClient.getSalario());

            try {
                rabbitTemplate.convertAndSend(sagaExchange, updateLimitKey, payload);

            } catch (Exception e) {
                logger.error("Erro ao enviar evento de atualização de limite ou durante espera: {}", e.getMessage());
            }
        }

        return convertToDTO(savedClient);
    }

    @Transactional
    public void updateClientAccount(String cpf, String conta) {
        Client client = clientRepository.findById(cpf)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado com CPF: " + cpf));

        client.setConta(conta);
        clientRepository.save(client);
        logger.info("Conta {} atribuída ao cliente {}", conta, cpf);
    }

    public List<ClientDTO> getAllApprovedClients() {
        return clientRepository.findByAprovadoTrue().stream().map(this::convertToDTO).toList();
    }

    public ClientDTO getClientByCpf(String cpf) {
        return clientRepository.findById(cpf)
                .map(this::convertToDTO)
                .orElse(null);
    }

    public ClientDTO findByEmail(String email) {
        Client client = clientRepository.findByEmail(email);
        if (client == null) {
            return null;
        }
        return convertToDTO(client);
    }

    public List<ClientDTO> getAllPendingClients() {
        return clientRepository.findByAprovadoFalse().stream().map(this::convertToDTO).toList();
    }

    @Transactional
    public void approveClient(String cpf) {
        logger.info("[Gerente] Iniciando aprovação para CPF: {}", cpf);
        Client client = clientRepository.findById(cpf)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado com CPF: " + cpf));

        if (Boolean.TRUE.equals(client.getAprovado())) {
            logger.warn("[Gerente] Cliente {} já está aprovado. Nenhuma ação tomada.", cpf);
            return;
        }
        client.setAprovado(true);
        clientRepository.save(client);
        logger.info("[Gerente] Cliente {} APROVADO com sucesso no client-service.", cpf);
    }

    @Transactional
    public void rejectClient(String cpf, String motivo) {
        Client client = clientRepository.findById(cpf)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado"));

        if (Boolean.TRUE.equals(client.getAprovado())) {
            throw new IllegalStateException("Cliente já aprovado não pode ser rejeitado");
        }

        clientRepository.delete(client);
        emailService.sendRejectionEmail(client.getEmail(), client.getNome(), motivo);
        logger.info("Cliente {} rejeitado e email enviado", cpf);
    }

    private ClientDTO convertToDTO(Client client) {
        return new ClientDTO(
                client.getCpf(),
                client.getNome(),
                client.getEmail(),
                client.getTelefone(),
                client.getSalario(),
                client.getEndereco(),
                client.getCep(),
                client.getCidade(),
                client.getEstado(),
                client.getConta());
    }

    @Transactional
    public void reboot() {
        clientRepository.deleteAll();
        insertInitialData();
        logger.info("Reboot do ClientService finalizado com sucesso.");
    }

    private void insertInitialData() {
        createSeedClient("12912861012", "Catharyna", "cli1@bantads.com.br", new BigDecimal("10000.00"),
                LocalDateTime.of(2000, 1, 1, 0, 0), "1291");
        createSeedClient("09506382000", "Cleuddônio", "cli2@bantads.com.br", new BigDecimal("20000.00"),
                LocalDateTime.of(1990, 10, 10, 0, 0), "0950");
        createSeedClient("85733854057", "Catianna", "cli3@bantads.com.br", new BigDecimal("3000.00"),
                LocalDateTime.of(2012, 12, 12, 0, 0), "8573");
        createSeedClient("58872160006", "Cutardo", "cli4@bantads.com.br", new BigDecimal("500.00"),
                LocalDateTime.of(2022, 2, 22, 0, 0), "5887");
        createSeedClient("76179646090", "Coândrya", "cli5@bantads.com.br", new BigDecimal("1500.00"),
                LocalDateTime.of(2025, 1, 1, 0, 0), "7617");
    }

    private void createSeedClient(String cpf, String nome, String email, BigDecimal salario, LocalDateTime dataCadastro,
            String conta) {
        Client client = new Client();
        client.setCpf(cpf);
        client.setNome(nome);
        client.setEmail(email);
        client.setSalario(salario);
        client.setDataCadastro(dataCadastro);
        client.setAprovado(true);
        client.setTelefone("(41) 99999-9999");
        client.setEndereco("Rua do Seed, 123");
        client.setCep("80000-000");
        client.setCidade("Curitiba");
        client.setEstado("PR");
        client.setConta(conta);

        clientRepository.save(client);
    }
}