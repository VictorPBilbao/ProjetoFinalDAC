package br.ufpr.auth_service.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LogoutResponse {
    private String cpf;
    private String nome;
    private String email;
    private String tipo;
}