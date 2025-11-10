package br.ufpr.saga_orchestrator.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.saga_orchestrator.result.SagaResult;
import br.ufpr.saga_orchestrator.service.SagaService;
import jakarta.validation.constraints.NotBlank;
import java.util.Map;

@RestController
@RequestMapping("/orchestrator")
public class SagaController {

    private final SagaService sagaService;

    public SagaController(SagaService sagaService) {
        this.sagaService = sagaService;
    }

    // this endpoint will approve a client
    @PostMapping("/clients/approve/{clientId}")
    public ResponseEntity<SagaResult> approveClient(
            @PathVariable @NotBlank String clientId,
            @RequestParam @NotBlank String managerId,
            @RequestParam(required = false, defaultValue = "123") String password) {
        SagaResult result = sagaService.approveClient(clientId, managerId, password);
        return ResponseEntity.ok(result);
    }

    // this endpoint will update client profile
    @PutMapping("/clients/update/{clientId}")
    public ResponseEntity<SagaResult> updateClientProfile(
            @PathVariable @NotBlank String clientId,
            @RequestBody Map<String, Object> clientUpdateData) {

        SagaResult result = sagaService.updateClientProfile(clientId, clientUpdateData);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/managers/create-saga")
    public ResponseEntity<SagaResult> createManagerSaga(@RequestBody Map<String, Object> managerDto) {
        SagaResult result = sagaService.createManagerSaga(managerDto);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/managers/delete-saga/{managerId}")
    public ResponseEntity<SagaResult> deleteManagerSaga(
            @PathVariable String managerId,
            @RequestParam(required = false) String recipientId) {
        SagaResult result = sagaService.deleteManagerSaga(managerId, recipientId);
        return ResponseEntity.ok(result);
    }
}
