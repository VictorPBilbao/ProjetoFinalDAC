package br.ufpr.auth_service.model.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String email;
    private String senha;
}