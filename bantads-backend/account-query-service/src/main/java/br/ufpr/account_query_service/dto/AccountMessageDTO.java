package br.ufpr.account_query_service.dto;

public class AccountMessageDTO {

    private String id;
    private String clientCpf;
    private String clientNome;
    private double saldo;
    private double limite;
    private String numero;
    private java.util.Date dataCriacao;
    private String managerCpf;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getClientCpf() {
        return clientCpf;
    }

    public void setClientCpf(String clientCpf) {
        this.clientCpf = clientCpf;
    }

    public String getClientNome() {
        return clientNome;
    }

    public void setClientNome(String clientNome) {
        this.clientNome = clientNome;
    }

    public double getSaldo() {
        return saldo;
    }

    public void setSaldo(double saldo) {
        this.saldo = saldo;
    }

    public double getLimite() {
        return limite;
    }

    public void setLimite(double limite) {
        this.limite = limite;
    }

    public String getNumero() {
        return numero;
    }

    public void setNumero(String numero) {
        this.numero = numero;
    }

    public java.util.Date getDataCriacao() {
        return dataCriacao;
    }

    public void setDataCriacao(java.util.Date dataCriacao) {
        this.dataCriacao = dataCriacao;
    }

    public String getManagerCpf() {
        return managerCpf;
    }

    public void setManagerCpf(String managerCpf) {
        this.managerCpf = managerCpf;
    }
}
