package br.ufpr.account_query_service.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "account_view", schema = "account_query_schema")
@Data
public class AccountView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String clientId;
    private String accountNumber;
    private BigDecimal balance;
    @Column(name = "account_limit")
    private BigDecimal limit;
    private String managerId;
    private LocalDateTime creationDate;

}