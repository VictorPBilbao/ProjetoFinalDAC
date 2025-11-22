package br.ufpr.account_service.dto;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public class TransactionRequestDTO {

    @NotNull(message = "O valor não pode ser nulo")
    @Positive(message = "O valor deve ser positivo")
    @JsonProperty("valor")
    private BigDecimal valor;

    public BigDecimal getValor() {
        return valor;
    }

    public void setValor(BigDecimal valor) {
        this.valor = valor;
    }
}
