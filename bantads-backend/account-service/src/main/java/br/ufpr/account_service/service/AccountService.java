package br.ufpr.account_service.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import br.ufpr.account_service.dto.BalanceDTO;
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.model.Transaction;
import br.ufpr.account_service.repository.AccountRepository;
import br.ufpr.account_service.repository.TransactionRepository;
import java.util.Map;
import java.util.HashMap;
@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private RabbitTemplate rabbitTemplate;

    @Value("${rabbit.account.events.exchange:account.events.exchange}")
    private String accountEventsExchange;

    private Account findAccountByClientCpf(String clientCpf) {
        return accountRepository.findByClientId(clientCpf)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Conta não encontrada para o cliente CPF: " + clientCpf));
    }

    @Transactional
    public Account deposit(String clientCpf, BigDecimal amount) {
        Account account = findAccountByClientCpf(clientCpf);
        account.setBalance(account.getBalance().add(amount));

        Transaction tx = new Transaction();
        tx.setAccount(account);
        tx.setType("DEPOSITO");
        tx.setAmount(amount);
        tx.setTimestamp(LocalDateTime.now());
        transactionRepository.save(tx);

        Account savedAccount = accountRepository.save(account);

        publishCqrsEvent("account.updated", savedAccount);
        publishCqrsEvent("transaction.created", tx);
        return savedAccount;
    }

    @Transactional
    public Account withdraw(String clientCpf, BigDecimal amount) {
        Account account = findAccountByClientCpf(clientCpf);

        BigDecimal availableBalance = account.getBalance().add(account.getAccountLimit());
        if (availableBalance.compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Saldo insuficiente para saque.");
        }

        account.setBalance(account.getBalance().subtract(amount));

        Transaction tx = new Transaction();
        tx.setAccount(account);
        tx.setType("SAQUE");
        tx.setAmount(amount.negate());
        tx.setTimestamp(LocalDateTime.now());
        transactionRepository.save(tx);

        Account savedAccount = accountRepository.save(account);

        publishCqrsEvent("account.updated", savedAccount);
        publishCqrsEvent("transaction.created", tx);
        return savedAccount;
    }

    @Transactional
    public Account transfer(String clientCpf, String destinationAccountNumber, BigDecimal amount) {

        Account originAccount = findAccountByClientCpf(clientCpf);

        BigDecimal availableBalance = originAccount.getBalance().add(originAccount.getAccountLimit());
        if (availableBalance.compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Saldo insuficiente para transferência.");
        }
        originAccount.setBalance(originAccount.getBalance().subtract(amount));

        Account destAccount = accountRepository.findByAccountNumber(destinationAccountNumber)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conta de destino não encontrada."));
        destAccount.setBalance(destAccount.getBalance().add(amount));

        Transaction originTx = new Transaction();
        originTx.setAccount(originAccount);
        originTx.setType("TRANSFERENCIA_ENVIADA");
        originTx.setAmount(amount.negate());
        originTx.setDestinationClientId(destAccount.getClientId());
        originTx.setTimestamp(LocalDateTime.now());
        transactionRepository.save(originTx);

        Transaction destTx = new Transaction();
        destTx.setAccount(destAccount);
        destTx.setType("TRANSFERENCIA_RECEBIDA");
        destTx.setAmount(amount);
        destTx.setOriginClientId(originAccount.getClientId());
        destTx.setTimestamp(LocalDateTime.now());
        transactionRepository.save(destTx);

        accountRepository.save(destAccount);
        Account savedOriginAccount = accountRepository.save(originAccount);

        publishCqrsEvent("account.updated", savedOriginAccount);
        publishCqrsEvent("account.updated", destAccount);
        publishCqrsEvent("transaction.created", originTx);
        publishCqrsEvent("transaction.created", destTx);

        return savedOriginAccount;
    }

    @Transactional
    public Account updateLimitByClientId(String clientId, BigDecimal newSalary) {
        Account account = findAccountByClientCpf(clientId);

        BigDecimal newLimit = BigDecimal.ZERO;
        if (newSalary.compareTo(new BigDecimal("2000.00")) >= 0) {
            newLimit = newSalary.divide(BigDecimal.valueOf(2));
        }

        BigDecimal currentBalance = account.getBalance();

        if (currentBalance.compareTo(BigDecimal.ZERO) < 0 && newLimit.compareTo(currentBalance.abs()) < 0) {
            newLimit = currentBalance.abs();
        }

        account.setAccountLimit(newLimit);
        Account savedAccount = accountRepository.save(account);

        publishCqrsEvent("account.updated", savedAccount);
        return savedAccount;
    }

    public void publishCqrsEvent(String routingKey, Object event) {
        Object payload = event;
        
        if (event instanceof Account) {
            Account a = (Account) event;
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("clientCpf", a.getClientId());
            map.put("numero", a.getAccountNumber());
            map.put("saldo", a.getBalance());
            map.put("limite", a.getAccountLimit()); 
            map.put("managerCpf", a.getManager());
            map.put("dataCriacao", a.getCreationDate());
            payload = map;
        } else if (event instanceof Transaction) {
            Transaction t = (Transaction) event;
            Map<String, Object> map = new HashMap<>();
            map.put("id", t.getId());
            map.put("dataHora", t.getTimestamp());
            map.put("tipo", t.getType());
            map.put("valor", t.getAmount()); 
            map.put("origemCpf", t.getOriginClientId());
            map.put("destinoCpf", t.getDestinationClientId());
            payload = map;
        }

        rabbitTemplate.convertAndSend(accountEventsExchange, routingKey, payload);
    }

    public BalanceDTO getBalance(String accountNumber) {
        Account account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Conta não encontrada: " + accountNumber));

        return new BalanceDTO(
                account.getClientId(),
                account.getAccountNumber(),
                account.getBalance()
        );
    }

    @Transactional
    public void rebootAccounts() {
        transactionRepository.deleteAll();
        accountRepository.deleteAll();

        insertInitialData();
    }

    private void insertInitialData() {
        String genieveCpf = "98574307084";
        String godophredoCpf = "64065268052";
        String gyandulaCpf = "23862179060";

        Account catharyna = createSeedAccount(
                "12912861012", "1291", new BigDecimal("800.00"), new BigDecimal("5000.00"),
                genieveCpf, LocalDateTime.of(2000, 1, 1, 0, 0)
        );
        createSeedTransaction(catharyna, "DEPOSITO", new BigDecimal("1000.00"), LocalDateTime.of(2020, 1, 1, 10, 0), null);
        createSeedTransaction(catharyna, "DEPOSITO", new BigDecimal("900.00"), LocalDateTime.of(2020, 1, 1, 11, 0), null);
        createSeedTransaction(catharyna, "SAQUE", new BigDecimal("-550.00"), LocalDateTime.of(2020, 1, 1, 12, 0), null);
        createSeedTransaction(catharyna, "SAQUE", new BigDecimal("-350.00"), LocalDateTime.of(2020, 1, 1, 13, 0), null);
        createSeedTransaction(catharyna, "DEPOSITO", new BigDecimal("2000.00"), LocalDateTime.of(2020, 1, 10, 15, 0), null);
        createSeedTransaction(catharyna, "SAQUE", new BigDecimal("-500.00"), LocalDateTime.of(2020, 1, 15, 8, 0), null);
        createSeedTransaction(catharyna, "TRANSFERENCIA_ENVIADA", new BigDecimal("-1700.00"), LocalDateTime.of(2020, 1, 20, 12, 0), "09506382000");

        Account cleuddonio = createSeedAccount(
                "09506382000", "0950", new BigDecimal("-10000.00"), new BigDecimal("10000.00"),
                godophredoCpf, LocalDateTime.of(1990, 10, 10, 0, 0)
        );
        createSeedTransaction(cleuddonio, "DEPOSITO", new BigDecimal("1000.00"), LocalDateTime.of(2025, 1, 1, 12, 0), null);
        createSeedTransaction(cleuddonio, "DEPOSITO", new BigDecimal("5000.00"), LocalDateTime.of(2025, 1, 2, 10, 0), null);
        createSeedTransaction(cleuddonio, "SAQUE", new BigDecimal("-200.00"), LocalDateTime.of(2025, 1, 10, 10, 0), null);
        createSeedTransaction(cleuddonio, "DEPOSITO", new BigDecimal("7000.00"), LocalDateTime.of(2025, 2, 5, 10, 0), null);

        Account catianna = createSeedAccount(
                "85733854057", "8573", new BigDecimal("-1000.00"), new BigDecimal("1500.00"),
                gyandulaCpf, LocalDateTime.of(2012, 12, 12, 0, 0)
        );
        createSeedTransaction(catianna, "DEPOSITO", new BigDecimal("1000.00"), LocalDateTime.of(2025, 5, 5, 10, 0), null); // Hora fictícia pois só tem data no PDF
        createSeedTransaction(catianna, "SAQUE", new BigDecimal("-2000.00"), LocalDateTime.of(2025, 5, 6, 10, 0), null);

        Account cutardo = createSeedAccount(
                "58872160006", "5887", new BigDecimal("150000.00"), new BigDecimal("0.00"),
                genieveCpf, LocalDateTime.of(2022, 2, 22, 0, 0)
        );
        createSeedTransaction(cutardo, "DEPOSITO", new BigDecimal("150000.00"), LocalDateTime.of(2025, 6, 1, 10, 0), null);

        Account coandrya = createSeedAccount(
                "76179646090", "7617", new BigDecimal("1500.00"), new BigDecimal("0.00"),
                godophredoCpf, LocalDateTime.of(2025, 1, 1, 0, 0)
        );
        createSeedTransaction(coandrya, "DEPOSITO", new BigDecimal("1500.00"), LocalDateTime.of(2025, 7, 1, 10, 0), null);
    }

    private Account createSeedAccount(String clientId, String accountNumber, BigDecimal balance, BigDecimal limit, String managerId, LocalDateTime creationDate) {
        if (accountRepository.findByAccountNumber(accountNumber).isPresent()) {
            return accountRepository.findByAccountNumber(accountNumber).get();
        }

        Account account = new Account();
        account.setClientId(clientId);
        account.setAccountNumber(accountNumber);
        account.setBalance(balance);
        account.setAccountLimit(limit);
        account.setManager(managerId);
        account.setCreationDate(creationDate);

        Account saved = accountRepository.save(account);
        publishCqrsEvent("account.updated", saved);
        return saved;
    }

    private void createSeedTransaction(Account account, String type, BigDecimal amount, LocalDateTime timestamp, String relatedClientId) {

        Transaction tx = new Transaction();
        tx.setAccount(account);
        tx.setType(type);
        tx.setAmount(amount);
        tx.setTimestamp(timestamp);

        if ("TRANSFERENCIA_ENVIADA".equals(type)) {
            tx.setDestinationClientId(relatedClientId);
        } else if ("TRANSFERENCIA_RECEBIDA".equals(type)) {
            tx.setOriginClientId(relatedClientId);
        }

        transactionRepository.save(tx);
        publishCqrsEvent("transaction.created", tx);
    }
}
