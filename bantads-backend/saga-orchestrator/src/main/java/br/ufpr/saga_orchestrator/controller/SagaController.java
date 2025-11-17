package br.ufpr.saga_orchestrator.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.ufpr.saga_orchestrator.result.SagaResult;
import br.ufpr.saga_orchestrator.service.SagaService;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

@RestController
public class SagaController {

    private final SagaService sagaService;

    public SagaController(SagaService sagaService) {
        this.sagaService = sagaService;
    }

    @GetMapping
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Saga Orchestrator ativo!");
    }

    // Criar gerente (e fluxos correlatos)
    @PostMapping("/gerentes")
    public ResponseEntity<SagaResult> criarGerenteSaga(
            @RequestBody Map<String, Object> managerDto,
            @RequestHeader(name = "Authorization", required = false) String authorization) {
        SagaResult result = sagaService.createManagerSaga(managerDto, authorization);
        return ResponseEntity.status(201).body(result);
    }

    @PutMapping("/gerentes/{cpf}")
    public ResponseEntity<SagaResult> atualizarGerenteSaga(
            @PathVariable @NotBlank String cpf,
            @RequestBody Map<String, Object> managerDto,
            @RequestHeader(name = "Authorization", required = false) String authorization) {
        SagaResult result = sagaService.updateManagerSaga(cpf, managerDto, authorization);
        return ResponseEntity.ok(result);
    }
}