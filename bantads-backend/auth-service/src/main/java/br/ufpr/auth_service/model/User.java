package br.ufpr.auth_service.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String cpf;

    @Indexed(unique = true)
    private String email;

    private String senha; // BCrypt hashed password

    private String tipo; // CLIENTE, GERENTE, ADMINISTRADOR

    private String nome;

    private Boolean ativo = true;

    private LocalDateTime createdAt = LocalDateTime.now();
}