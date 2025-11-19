package br.ufpr.account_query_service.dto;

public class ManagerSummaryDTO {

    private String gerenteCpf;
    private Long qtdClientes;
    private Double totalPositivo;
    private Double totalNegativo;

    public ManagerSummaryDTO() {
    }

    public ManagerSummaryDTO(String gerenteCpf, Long qtdClientes, Double totalPositivo, Double totalNegativo) {
        this.gerenteCpf = gerenteCpf;
        this.qtdClientes = qtdClientes;
        this.totalPositivo = totalPositivo;
        this.totalNegativo = totalNegativo;
    }

    public String getGerenteCpf() {
        return gerenteCpf;
    }

    public void setGerenteCpf(String gerenteCpf) {
        this.gerenteCpf = gerenteCpf;
    }

    public Long getQtdClientes() {
        return qtdClientes;
    }

    public void setQtdClientes(Long qtdClientes) {
        this.qtdClientes = qtdClientes;
    }

    public Double getTotalPositivo() {
        return totalPositivo;
    }

    public void setTotalPositivo(Double totalPositivo) {
        this.totalPositivo = totalPositivo;
    }

    public Double getTotalNegativo() {
        return totalNegativo;
    }

    public void setTotalNegativo(Double totalNegativo) {
        this.totalNegativo = totalNegativo;
    }
}
