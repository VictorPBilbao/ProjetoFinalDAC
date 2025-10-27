package br.ufpr.account_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions", schema = "account_schema")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "client_id", nullable = false, length = 11)

    private String clientId;
    @Column(name = "account_number", nullable = false)
    private Long accountNumber;
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();
    @Column(name = "type", nullable = false, length = 20)
    private String type; // depósito, saque, transferência
    @Column(name = "origin_client_id", length = 11)
    private String originClientId; // para transferências
    @Column(name = "destination_client_id", length = 11)
    private String destinationClientId; // para transferências
    @Column(name = "amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

}
