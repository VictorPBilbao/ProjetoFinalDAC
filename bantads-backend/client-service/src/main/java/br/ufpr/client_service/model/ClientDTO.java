package br.ufpr.client_service.model;

import java.math.BigDecimal;

public class ClientDTO {
    private String cpf;
    private String nome;
    private String email;
    private String telefone;
    private BigDecimal salario;
    private String endereco;
    private String cep;
    private String cidade;
    private String estado;
    private String conta; // Novo campo

    public ClientDTO() {
    }

    public ClientDTO(String cpf, String nome, String email, String telefone, BigDecimal salario,
            String endereco, String cep, String cidade, String estado, String conta) {
        this.cpf = cpf;
        this.nome = nome;
        this.email = email;
        this.telefone = telefone;
        this.salario = salario;
        this.endereco = endereco;
        this.cep = cep;
        this.cidade = cidade;
        this.estado = estado;
        this.conta = conta;
    }

    // Construtor legado para compatibilidade (opcional, mas bom manter)
    public ClientDTO(String cpf, String nome, String email, String telefone, BigDecimal salario,
            String endereco, String cep, String cidade, String estado) {
        this(cpf, nome, email, telefone, salario, endereco, cep, cidade, estado, null);
    }

    // Getters e Setters
    public String getCpf() {
        return cpf;
    }

    public void setCpf(String cpf) {
        this.cpf = cpf;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelefone() {
        return telefone;
    }

    public void setTelefone(String telefone) {
        this.telefone = telefone;
    }

    public BigDecimal getSalario() {
        return salario;
    }

    public void setSalario(BigDecimal salario) {
        this.salario = salario;
    }

    public String getEndereco() {
        return endereco;
    }

    public void setEndereco(String endereco) {
        this.endereco = endereco;
    }

    public String getCep() {
        return cep;
    }

    public void setCep(String cep) {
        this.cep = cep;
    }

    public String getCidade() {
        return cidade;
    }

    public void setCidade(String cidade) {
        this.cidade = cidade;
    }

    public String getEstado() {
        return estado;
    }

    public void setEstado(String estado) {
        this.estado = estado;
    }

    public String getConta() {
        return conta;
    }

    public void setConta(String conta) {
        this.conta = conta;
    }
}