package br.ufpr.client_service.service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public ClientService(ClientRepository clientRepository, EmailService emailService) {
        this.clientRepository = clientRepository;
        this.emailService = emailService;
    }

    // ? Autocadastro - R1
    @Transactional
    public ClientDTO autocadastro(AutocadastroRequestDTO request) {
        // Check if CPF already exists (approved or pending)
        if (clientRepository.existsById(request.getCpf())) {
            throw new IllegalArgumentException(
                    "Cliente já cadastrado ou aguardando aprovação com CPF: " + request.getCpf());
        }

        // Check if email already exists
        if (clientRepository.findByEmail(request.getEmail()) != null) {
            throw new IllegalArgumentException("Email já cadastrado: " + request.getEmail());
        }

        // Create new client entity
        Client client = new Client();
        client.setCpf(request.getCpf());
        client.setNome(request.getNome());
        client.setEmail(request.getEmail());
        client.setTelefone(request.getTelefone());
        client.setSalario(request.getSalario());
        client.setEndereco(request.getEndereco());
        client.setCep(request.getCep()); // Note: converting from uppercase CEP
        client.setCidade(request.getCidade());
        client.setEstado(request.getEstado());
        client.setAprovado(false); // Awaiting approval
        client.setDataCadastro(LocalDateTime.now());

        // Save client
        Client savedClient = clientRepository.save(client);

        return convertToDTO(savedClient);
    }

    public ClientDTO updateClient(String cpf, ClientDTO updatedData) {
        Client client = clientRepository.findById(cpf)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado com CPF: " + cpf));

        // Update fields
        client.setNome(updatedData.getNome());
        client.setEmail(updatedData.getEmail());
        client.setTelefone(updatedData.getTelefone());
        client.setSalario(updatedData.getSalario());
        client.setEndereco(updatedData.getEndereco());
        client.setCep(updatedData.getCep());
        client.setCidade(updatedData.getCidade());
        client.setEstado(updatedData.getEstado());

        Client savedClient = clientRepository.save(client);
        return convertToDTO(savedClient);
    }

    // ? Get all approved clients
    public List<ClientDTO> getAllApprovedClients() {
        return clientRepository.findByAprovadoTrue().stream().map(this::convertToDTO).toList();
    }

    // ? Get client by CPF
    public ClientDTO getClientByCpf(String cpf) {
        return clientRepository.findById(cpf)
                .map(this::convertToDTO)
                .orElse(null); // não lança exceção
    }

    public ClientDTO findByEmail(String email) {
        Client client = clientRepository.findByEmail(email);
        if (client == null) {
            return null; // sem exception
        }
        return convertToDTO(client);
    }

    // ? Get pending clients
    public List<ClientDTO> getAllPendingClients() {
        return clientRepository.findByAprovadoFalse().stream().map(this::convertToDTO).toList();
    }

    // get approve client
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

    // get reject client
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
                client.getEstado());
    }

    @Transactional
    public void reboot() {
        clientRepository.deleteAll();
    }
}
