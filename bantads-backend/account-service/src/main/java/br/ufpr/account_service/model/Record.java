package br.ufpr.account_service.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Date;

@Entity
@Table(name = "record", schema = "account_schema")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Record {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "date")
    private Date date;

    @Column(name = "consolidated_balance")
    private BigDecimal consolidatedBalance;

    @Column(name = "account_number")
    private String accountNumber;
}