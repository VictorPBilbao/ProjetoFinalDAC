package br.ufpr.client_service.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.client_service.model.AutocadastroRequestDTO;
import br.ufpr.client_service.model.ClientDTO;
import br.ufpr.client_service.service.ClientService;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping; 
import org.springframework.web.bind.annotation.RequestBody;

import br.ufpr.client_service.model.RejectReasonDTO;

@RestController
@RequestMapping("/clientes")
@CrossOrigin(origins = "*")
@Validated
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    @PostMapping
    public ResponseEntity<ClientDTO> autocadastro(@Valid @RequestBody AutocadastroRequestDTO request) {
        try {
            ClientDTO createdClient = clientService.autocadastro(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdClient);
        } catch (IllegalArgumentException e) {
            // CPF or email already exists (409 Conflict)
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            // Other validation errors (400 Bad Request)
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<ClientDTO>> getAllClients() {
        List<ClientDTO> clients = clientService.getAllApprovedClients();
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/{cpf}")
    public ResponseEntity<ClientDTO> getClientByCpf(@PathVariable String cpf) {
        try {
            ClientDTO client = clientService.getClientByCpf(cpf);
            return ResponseEntity.ok(client);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("✅ Client Service is running!");
    }

    @GetMapping("/pending")
    public ResponseEntity<List<ClientDTO>> getPendingClients() {
        List<ClientDTO> clients = clientService.getAllPendingClients();
        return ResponseEntity.ok(clients);
    }

    @PostMapping("/{cpf}/approve")
    public ResponseEntity<Void> approveClient(@PathVariable String cpf) {
        try {
            clientService.approveClient(cpf);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/{cpf}/reject")
    public ResponseEntity<Void> rejectClient(@PathVariable String cpf, @Valid @RequestBody RejectReasonDTO dto) {
        try {
            clientService.rejectClient(cpf, dto.getMotivo());
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

}
