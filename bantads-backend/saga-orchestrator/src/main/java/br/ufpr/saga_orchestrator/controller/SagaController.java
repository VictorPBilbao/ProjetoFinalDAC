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
    public ResponseEntity<?> criarGerenteSaga(
            @RequestBody Map<String, Object> managerDto,
            @RequestHeader(name = "Authorization", required = false) String authorization) {

        SagaResult result = sagaService.createManagerSaga(managerDto);

        // Respect the SagaResult statusCode so caller can act accordingly.
        if (!result.isSuccess()) {
            return ResponseEntity.status(result.getStatusCode()).body(Map.of("erro", result.getMessage()));
        }

        // Success can be immediate (201) or async/pending (202). Return the statusCode
        // and useful body.
        int code = result.getStatusCode();
        if (code == 202) {
            // pending: return correlationId so caller can poll for final result
            Object detail = result.getDetail();
            String cid = null;
            if (detail instanceof Map) {
                Object c = ((Map<?, ?>) detail).get("correlationId");
                if (c != null)
                    cid = String.valueOf(c);
            }
            return ResponseEntity.status(202).body(Map.of("correlationId", cid, "status", "pending"));
        }

        // default: return detail as body
        return ResponseEntity.status(code).body(result.getDetail());
    }

    @GetMapping("/saga/result/{correlationId}")
    public ResponseEntity<?> getSagaResult(@PathVariable String correlationId) {
        SagaResult r = sagaService.getSagaResult(correlationId);
        if (r == null)
            return ResponseEntity.notFound().build();
        if (!r.isSuccess()) {
            return ResponseEntity.status(r.getStatusCode())
                    .body(Map.of("erro", r.getMessage(), "detail", r.getDetail()));
        }
        return ResponseEntity.status(r.getStatusCode()).body(r.getDetail());
    }

    @PutMapping("/gerentes/{cpf}")
    public ResponseEntity<?> atualizarGerenteSaga(
            @PathVariable @NotBlank String cpf,
            @RequestBody Map<String, Object> managerDto,
            @RequestHeader(name = "Authorization", required = false) String authorization) {

        managerDto.put("cpf", cpf);
        SagaResult result = sagaService.updateManagerSaga(cpf, managerDto, authorization);

        if (!result.isSuccess()) {
            return ResponseEntity.status(result.getStatusCode()).body(Map.of("erro", result.getMessage()));
        }

        int code = result.getStatusCode();
        if (code == 202) {
            Object detail = result.getDetail();
            String cid = null;
            if (detail instanceof Map) {
                Object c = ((Map<?, ?>) detail).get("correlationId");
                if (c != null)
                    cid = String.valueOf(c);
            }
            return ResponseEntity.status(202).body(Map.of("correlationId", cid, "status", "pending"));
        }

        return ResponseEntity.status(code).body(result.getDetail());
    }

    @DeleteMapping("/gerentes/{cpf}")
    public ResponseEntity<?> deletarGerenteSaga(@PathVariable @NotBlank String cpf) {

        SagaResult result = sagaService.deleteManagerSaga(cpf);

        if (!result.isSuccess()) {
            return ResponseEntity.status(result.getStatusCode()).body(Map.of("erro", result.getMessage()));
        }

        int code = result.getStatusCode();
        if (code == 202) {
            Object detail = result.getDetail();
            String cid = null;
            if (detail instanceof Map) {
                Object c = ((Map<?, ?>) detail).get("correlationId");
                if (c != null)
                    cid = String.valueOf(c);
            }
            return ResponseEntity.status(202).body(Map.of("correlationId", cid, "status", "pending"));
        }

        return ResponseEntity.status(code).body(result.getDetail());
    }

    @PostMapping("/clientes/{cpf}/aprovar")
    public ResponseEntity<?> aprovarClienteSaga(@PathVariable @NotBlank String cpf) {

        SagaResult result = sagaService.approveClientSaga(cpf);

        if (!result.isSuccess()) {
            return ResponseEntity.status(result.getStatusCode()).body(Map.of("erro", result.getMessage()));
        }

        int code = result.getStatusCode();
        if (code == 202) {
            Object detail = result.getDetail();
            String cid = null;
            if (detail instanceof Map) {
                Object c = ((Map<?, ?>) detail).get("correlationId");
                if (c != null)
                    cid = String.valueOf(c);
            }
            return ResponseEntity.status(200).body(Map.of("correlationId", cid, "status", "pending"));
        }

        return ResponseEntity.ok(result.getDetail());
    }

    @PutMapping("/clientes/{cpf}")
    public ResponseEntity<?> updateClienteSaga(@PathVariable @NotBlank String cpf,
            @RequestBody Map<String, Object> clientDto) {

        SagaResult result = sagaService.updateClientSaga(cpf, clientDto);

        if (!result.isSuccess()) {
            return ResponseEntity.status(result.getStatusCode()).body(Map.of("erro", result.getMessage()));
        }

        // After SAGA completes, compose complete client data
        try {
            Map<String, Object> composedData = sagaService.composeClientData(cpf);
            return ResponseEntity.ok(composedData);
        } catch (Exception ex) {
            return ResponseEntity.status(500)
                    .body(Map.of("erro", "Erro ao compor dados do cliente: " + ex.getMessage()));
        }
    }
}