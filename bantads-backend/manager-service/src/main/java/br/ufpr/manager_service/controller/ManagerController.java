package br.ufpr.manager_service.controller;

import br.ufpr.manager_service.model.ManagerDTO;
import br.ufpr.manager_service.model.Manager;
import br.ufpr.manager_service.service.ManagerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/gerentes")
public class ManagerController {

    @Autowired
    private ManagerService managerService;

    @GetMapping
    public ResponseEntity<?> getAllManagers() {
        List<Manager> managers = managerService.getAllManagers();

        List<Map<String, Object>> response = managers.stream()
            .map(manager -> {
                Map<String, Object> m = new java.util.HashMap<>();
                m.put("id", manager.getId());
                m.put("nome", manager.getName());
                m.put("email", manager.getEmail());
                m.put("cpf", manager.getCpf());
                m.put("telefone", manager.getTelephone());
                return m;
            })
            .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{cpf}")
    public ResponseEntity<?> getManagerByCpf(@PathVariable String cpf) {
        try {
            Manager manager = managerService.getManagerByCpf(cpf);
            if (manager == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of(
                        "erro", "Gerente não encontrado",
                        "status", 404
                    ));
            }
            Map<String, Object> response = new java.util.HashMap<>();
            response.put("id", manager.getId());
            response.put("nome", manager.getName());
            response.put("email", manager.getEmail());
            response.put("cpf", manager.getCpf());
            response.put("tipo", "GERENTE");
            response.put("telefone", manager.getTelephone());
            response.put("senha", manager.getPassword());

            return ResponseEntity.ok(response);
        } catch (ResponseStatusException e) {
            return ResponseEntity.status(e.getStatusCode())
                .body(Map.of(
                    "erro", e.getReason(),
                    "status", e.getStatusCode().value()
                ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of(
                    "erro", "Erro ao buscar gerente",
                    "message", e.getMessage(),
                    "status", 500
                ));
        }
    }

    @PostMapping("/reboot")
    public ResponseEntity<?> reboot() {
        try {
            managerService.reboot();
            return ResponseEntity.ok(Map.of("message", "Dados apagados com sucesso"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erro ao apagar dados: " + e.getMessage()));
        }
    }
}