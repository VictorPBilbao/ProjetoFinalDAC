package br.ufpr.account_service.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import br.ufpr.account_service.model.Transaction;

@Entity
@Table(name = "record", schema = "account_schema")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Record {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Date date;
    private BigDecimal consolidatedBalance;
    private List<Transaction> transactions;
}
