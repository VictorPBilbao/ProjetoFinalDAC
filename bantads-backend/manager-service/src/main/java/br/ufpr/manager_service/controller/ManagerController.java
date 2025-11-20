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
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/gerentes")
public class ManagerController {

    @Autowired
    private ManagerService managerService;

    @GetMapping
    public ResponseEntity<List<Manager>> getAllManagers() {
        List<Manager> managers = managerService.getAllManagers();
        return ResponseEntity.ok(managers);
    }

    @GetMapping("/{cpf}")
    public ResponseEntity<?> getManagerByCpf(@PathVariable String cpf) {
        try {
            Manager manager = managerService.getManagerByCpf(cpf);
            return ResponseEntity.ok(manager);
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
}