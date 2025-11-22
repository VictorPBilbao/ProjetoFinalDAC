package br.ufpr.account_service.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    @JsonProperty("conta")
    private String accountNumber;

    @Column(name = "creation_date", nullable = false)
    @JsonProperty("data")
    private LocalDateTime creationDate;

    @Column(name = "balance", nullable = false)
    @JsonProperty("saldo")
    private BigDecimal balance;

    @Column(name = "account_limit", nullable = false)
    private BigDecimal accountLimit;

    @Column(name = "manager", nullable = false, length = 100)
    private String manager;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Transaction> transactions = new ArrayList<>();
}
