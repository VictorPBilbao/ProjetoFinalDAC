package br.ufpr.client_service.service;

import java.util.List;

import org.springframework.stereotype.Service;

import br.ufpr.client_service.model.Client;
import br.ufpr.client_service.model.ClientDTO;
import br.ufpr.client_service.repository.ClientRepository;

@Service
public class ClientService {

    private final ClientRepository clientRepository;

    ClientService(ClientRepository clientRepository) {
        this.clientRepository = clientRepository;
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
