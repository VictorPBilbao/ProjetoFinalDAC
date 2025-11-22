package br.ufpr.account_query_service.dto;

public class TransactionMessageDTO {

    private String id;
    private String tipo;
    private String origemCpf;
    private String destinoCpf;
    private double valor;
    private String dataHora;
    private String accountId;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getOrigemCpf() {
        return origemCpf;
    }

    public void setOrigemCpf(String origemCpf) {
        this.origemCpf = origemCpf;
    }

    public String getDestinoCpf() {
        return destinoCpf;
    }

    public void setDestinoCpf(String destinoCpf) {
        this.destinoCpf = destinoCpf;
    }

    public double getValor() {
        return valor;
    }

    public void setValor(double valor) {
        this.valor = valor;
    }

    public String getDataHora() {
        return dataHora;
    }

    public void setDataHora(String dataHora) {
        this.dataHora = dataHora;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }
}