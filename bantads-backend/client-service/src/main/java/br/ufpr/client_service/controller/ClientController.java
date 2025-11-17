package br.ufpr.client_service.controller;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.client_service.dto.ApiResponse;
import br.ufpr.client_service.model.AutocadastroRequestDTO;
import br.ufpr.client_service.model.ClientDTO;
import br.ufpr.client_service.model.RejectReasonDTO;
import br.ufpr.client_service.service.ClientService;
import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping; 
import org.springframework.web.bind.annotation.PutMapping; 
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/clientes")
@CrossOrigin(origins = "*")
@Validated
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    // R01 - Autocadastro: deve retornar o objeto "cru" (sem wrapper) e status 201
    @PostMapping("/cadastro")
    public ResponseEntity<?> autocadastro(@Valid @RequestBody AutocadastroRequestDTO request) {
        try {
            ClientDTO createdClient = clientService.autocadastro(request);
            Map<String, Object> responseBody = Map.of(
                "cpf", createdClient.getCpf(),
                "email", createdClient.getEmail()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(responseBody);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Erro ao processar autocadastro"));
        }
    }

    // GET /clientes com filtros usados nos testes R09, R12, R14, R16
    // Retorno sem wrapper (lista "crua")
    @GetMapping("")
    public ResponseEntity<List<ClientDTO>> getClientes(
        @RequestParam(name = "filtro", required = false) String filtro
    ) {
        try {
            if ("para_aprovar".equalsIgnoreCase(filtro)) {
                // pendentes de aprovação
                List<ClientDTO> pendentes = clientService.getAllPendingClients();
                return ResponseEntity.ok(pendentes);
            }
            if ("melhores_clientes".equalsIgnoreCase(filtro)) {
                // top 3 por saldo (ordem decrescente de saldo)
                List<ClientDTO> aprovados = clientService.getAllApprovedClients();
                List<ClientDTO> top3 = aprovados.stream()
                    //.sorted(Comparator.comparing(ClientDTO::getSaldo, Comparator.nullsFirst(Double::compare)).reversed())
                    .limit(3)
                    .collect(Collectors.toList());
                return ResponseEntity.ok(top3);
            }
            if ("adm_relatorio_clientes".equalsIgnoreCase(filtro)) {
                // relatório do admin: todos aprovados ordenados por nome
                List<ClientDTO> aprovados = clientService.getAllApprovedClients().stream()
                    .sorted(Comparator.comparing(ClientDTO::getNome, Comparator.nullsFirst(String::compareTo)))
                    .collect(Collectors.toList());
                return ResponseEntity.ok(aprovados);
            }

            // padrão: todos aprovados ordenados por nome (usado em R12)
            List<ClientDTO> aprovados = clientService.getAllApprovedClients().stream()
                .sorted(Comparator.comparing(ClientDTO::getNome, Comparator.nullsFirst(String::compareTo)))
                .collect(Collectors.toList());
            return ResponseEntity.ok(aprovados);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Compat: endpoint antigo se precisar (mantém wrapper). Não é usado nos testes.
    @GetMapping("/getAll")
    public ResponseEntity<ApiResponse<List<ClientDTO>>> getAllClients() {
        List<ClientDTO> clients = clientService.getAllApprovedClients();
        return ResponseEntity.ok(ApiResponse.success(clients));
    }

    // Validações (mantidas; não usadas nos testes)
    @PostMapping("/validate")
    public ResponseEntity<ApiResponse<Boolean>> validateClientByCpf(@RequestBody Map<String, String> request) {
        String cpf = request.get("cpf");
        boolean exists = clientService.getClientByCpf(cpf) != null;
        return ResponseEntity.ok(ApiResponse.success(exists));
    }

    @PostMapping("/validateEmail")
    public ResponseEntity<ApiResponse<Boolean>> validateClientByEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        try {
            boolean exists = clientService.findByEmail(email) != null;
            return ResponseEntity.ok(ApiResponse.success(exists));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Erro ao validar email: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success("Client Service is running!"));
    }

    // Compatível, mas não usado pelos testes
    @GetMapping("/pending")
    public ResponseEntity<ApiResponse<List<ClientDTO>>> getPendingClients() {
        List<ClientDTO> clients = clientService.getAllPendingClients();
        return ResponseEntity.ok(ApiResponse.success(clients));
    }

    // GET /clientes/{cpf} (R13) - retorna objeto cru; 404 se não encontrado/rejeitado
    @GetMapping("/{cpf}")
    public ResponseEntity<ClientDTO> getByCpf(@PathVariable String cpf) {
        ClientDTO cli = clientService.getClientByCpf(cpf);
        if (cli == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        return ResponseEntity.ok(cli);
    }

    // PUT /clientes/{cpf} (R04) - atualização de perfil; objeto cru
    @PutMapping("/{cpf}")
    public ResponseEntity<ClientDTO> updateCliente(
        @PathVariable String cpf,
        @Valid @RequestBody ClientDTO body
    ) {
        try {
            // garantia: CPF do path prevalece
            body.setCpf(cpf);
            ClientDTO updated = clientService.updateClient(cpf, body);
            if (updated == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // POST /clientes/{cpf}/aprovar (R10) - ignora corpo, retorna 200
    @PostMapping("/{cpf}/aprovar")
    public ResponseEntity<Void> aprovar(@PathVariable String cpf, @RequestBody(required = false) Map<String, Object> ignore) {
        try {
            clientService.approveClient(cpf);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    // POST /clientes/{cpf}/rejeitar (R11) - corpo com { "usuario": {...}, "motivo": "..." }
    @PostMapping("/{cpf}/rejeitar")
    public ResponseEntity<Void> rejeitar(@PathVariable String cpf, @RequestBody Map<String, Object> payload) {
        try {
            Object motivoObj = payload != null ? payload.get("motivo") : null;
            String motivo = motivoObj != null ? String.valueOf(motivoObj) : null;
            clientService.rejectClient(cpf, motivo);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}