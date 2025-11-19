package br.ufpr.account_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "account", schema = "account_schema")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Account {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "client_id", nullable = false, length = 11, unique = true)
    private String clientId;

    @Column(name = "account_number", nullable = false, length = 20, unique = true)
    private String accountNumber;

    @Column(name = "creation_date", nullable = false)
    private LocalDateTime creationDate;

    @Column(name = "balance", nullable = false)
    private BigDecimal balance;

    @Column(name = "account_limit", nullable = false)
    private BigDecimal limit;

    @Column(name = "manager", nullable = false, length = 100)
    private String manager;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Transaction> transactions;
}