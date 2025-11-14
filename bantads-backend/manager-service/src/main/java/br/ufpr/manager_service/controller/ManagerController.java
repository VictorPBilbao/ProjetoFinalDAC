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

    @PostMapping
    public ResponseEntity<Manager> createManager(@Valid @RequestBody ManagerDTO dto) {
        Manager createdManager = managerService.createManager(dto);
        return new ResponseEntity<>(createdManager, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Manager> getManagerById(@PathVariable String id) {
        Manager manager = managerService.getManagerById(id);
        return ResponseEntity.ok(manager);
    }

    @PutMapping("/{cpf}")
    public ResponseEntity<Manager> updateManager(@PathVariable String cpf, @Valid @RequestBody ManagerDTO dto) {
        Manager updatedManager = managerService.updateManager(cpf, dto);
        return ResponseEntity.ok(updatedManager);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteManager(@PathVariable String id) {
        managerService.deleteManager(id);
        return ResponseEntity.noContent().build();
    }
}