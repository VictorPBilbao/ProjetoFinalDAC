package br.ufpr.auth_service.controller;

import br.ufpr.auth_service.model.dto.LoginRequest;
import br.ufpr.auth_service.model.dto.LoginResponse;
import br.ufpr.auth_service.model.dto.LogoutResponse;
import br.ufpr.auth_service.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    //Get all user 
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        try {
            var users = authService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erro ao buscar usuários"));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Usuário ou senha incorretos"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader("Authorization") String token) {
        try {
            LogoutResponse response = authService.logout(token);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Token inválido");
        }
    }

    @PostMapping("/create-user")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> userDto, @RequestHeader("Authorization") String token) {
        try {
            System.out.println("AuthController: criando usuário com dados: " + token + " | " + userDto);
            authService.createUser(userDto);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String token) {
        boolean valid = authService.validateToken(token);
        if (valid) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Auth Service is running");
    }

    @PostMapping("/reboot")
    public ResponseEntity<?> reboot() {
        try {
            authService.reboot();
            return ResponseEntity.status(HttpStatus.OK)
                    .body(Map.of("message", "Dados apagados com sucesso"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erro ao apagar dados: " + e.getMessage()));
        }
    }
}