package br.ufpr.auth_service.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    @JsonProperty("access_token")
    private String accessToken;
    @JsonProperty("token_type")
    private String tokenType;
    private String tipo;
    private UserInfo usuario;

    @Data
    @AllArgsConstructor
    public static class UserInfo {
        private String cpf;
        private String nome;
        private String email;
    }
}