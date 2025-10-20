package br.ufpr.manager_service.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class ManagerDTO {

    private String name;

    @Pattern(regexp = "\\d{11}", message = "CPF deve conter exatamente 11 dígitos")
    private String cpf;

    @Email(message = "Formato de e-mail inválido")
    private String email;

    private String telephone;

    @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    private String password;

    // Getters e Setters (essenciais para a classe funcionar com o serviço)
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCpf() { return cpf; }
    public void setCpf(String cpf) { this.cpf = cpf; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getTelephone() { return telephone; }
    public void setTelephone(String telephone) { this.telephone = telephone; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}