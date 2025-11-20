package br.ufpr.account_service.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountDTO implements Serializable {
    private Long id;
    private String clientId;
    private String accountNumber;
    private BigDecimal balance;
    private BigDecimal accountLimit; 
    private String manager;
    private LocalDateTime creationDate;
}