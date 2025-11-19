package br.ufpr.account_query_service.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class StatementItemDTO {
    private LocalDateTime dataHora;
    private String operacao;
    private String tipo;
    private String origem;
    private String destino;
    private BigDecimal valor;
}