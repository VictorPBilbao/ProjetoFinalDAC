package br.ufpr.saga_orchestrator.controller;

import br.ufpr.saga_orchestrator.result.SagaResult;
import br.ufpr.saga_orchestrator.service.SagaService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/orchestrator")
public class SagaController {

    private final SagaService sagaService;

    public SagaController(SagaService sagaService) {
        this.sagaService = sagaService;
    }

    @PostMapping("/clients/approve/{clientId}")
    public ResponseEntity<SagaResult> approveClient(
            @PathVariable @NotBlank String clientId,
            @RequestParam @NotBlank String managerId,
            @RequestParam(required = false, defaultValue = "123") String password) {
        SagaResult result = sagaService.approveClient(clientId, managerId, password);
        return ResponseEntity.ok(result);
    }
}