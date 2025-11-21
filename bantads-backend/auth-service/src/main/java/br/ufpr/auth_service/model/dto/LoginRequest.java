package br.ufpr.auth_service.model.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String login;
    private String senha;
}