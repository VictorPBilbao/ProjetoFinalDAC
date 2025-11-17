package br.ufpr.account_query_service.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transaction_view", schema = "account_query_schema")
@Data
public class TransactionView {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "account_id")
    private Long accountId;

    private LocalDateTime timestamp;
    private String type;
    private BigDecimal amount;
    private String originClientId;
    private String destinationClientId;
}