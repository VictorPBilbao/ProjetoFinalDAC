package br.ufpr.account_query_service.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DailyBalanceDTO {
    private LocalDate data;
    private BigDecimal saldoDoDia;
    private List<StatementItemDTO> movimentacoes;
}