package br.ufpr.client_service.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import br.ufpr.client_service.model.AutocadastroRequestDTO;
import br.ufpr.client_service.model.Client;
import br.ufpr.client_service.model.ClientDTO;
import br.ufpr.client_service.repository.ClientRepository;
import jakarta.transaction.Transactional;

@Service
public class ClientService {

    private final ClientRepository clientRepository;

    ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
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

    // ? Get all approved clients
    public List<ClientDTO> getAllApprovedClients() {
        return clientRepository.findByAprovadoTrue().stream().map(this::convertToDTO).toList();
    }

    // ? Get client by CPF
    public ClientDTO getClientByCpf(String cpf) {
        Client client = clientRepository.findById(cpf)
                .orElseThrow(() -> new RuntimeException("Cliente não encontrado com CPF: " + cpf));
        return convertToDTO(client);
    }

    // ? Get pending clients
    public List<ClientDTO> getAllPendingClients() {
        return clientRepository.findByAprovadoFalse().stream().map(this::convertToDTO).toList();
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
}
