package br.ufpr.client_service.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.client_service.dto.ApiResponse;
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

    @PostMapping("/cadastro")
    public ResponseEntity<ApiResponse<ClientDTO>> autocadastro(@Valid @RequestBody AutocadastroRequestDTO request) {
        try {
            ClientDTO createdClient = clientService.autocadastro(request);
            return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cliente cadastrado com sucesso", createdClient));
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error("CPF ou email já cadastrado"));
        } catch (Exception e) {
            return ResponseEntity
                .badRequest()
                .body(ApiResponse.error("Erro ao cadastrar cliente: " + e.getMessage()));
        }
    }

    @GetMapping("/getAll")
    public ResponseEntity<ApiResponse<List<ClientDTO>>> getAllClients() {
        List<ClientDTO> clients = clientService.getAllApprovedClients();
        return ResponseEntity.ok(ApiResponse.success(clients));
    }

    @PostMapping("/validateCPF")
    public ResponseEntity<ApiResponse<Boolean>> validateClientByCpf(@RequestBody Map<String, String> request) {
        String cpf = request.get("cpf");
        boolean exists = clientService.getClientByCpf(cpf) != null;
        return ResponseEntity.ok(ApiResponse.success(exists));
    }

    @PostMapping("/validateEmail")
    public ResponseEntity<ApiResponse<Boolean>> validateClientByEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        System.out.println("Validating email: " + email);
        try {
            boolean exists = clientService.findByEmail(email) != null;
            return ResponseEntity.ok(ApiResponse.success(exists));
        } catch (Exception e) {
            return ResponseEntity
                .badRequest()
                .body(ApiResponse.error("Erro ao validar email: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success("Client Service is running!"));
    }

    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<ClientDTO>>> getPendingClients() {
        List<ClientDTO> clients = clientService.getAllPendingClients();
        return ResponseEntity.ok(ApiResponse.success(clients));
    }

    @PostMapping("/{cpf}/approve")
    public ResponseEntity<ApiResponse<Void>> approveClient(@PathVariable String cpf) {
        try {
            clientService.approveClient(cpf);
            return ResponseEntity.ok(ApiResponse.success("Cliente aprovado com sucesso", null));
        } catch (RuntimeException e) {
            return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Cliente não encontrado"));
        }
    }

    @PostMapping("/{cpf}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectClient(@PathVariable String cpf, @Valid @RequestBody RejectReasonDTO dto) {
        try {
            clientService.rejectClient(cpf, dto.getMotivo());
            return ResponseEntity.ok(ApiResponse.success("Cliente rejeitado com sucesso", null));
        } catch (RuntimeException e) {
            return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("Cliente não encontrado"));
        }
    }
}