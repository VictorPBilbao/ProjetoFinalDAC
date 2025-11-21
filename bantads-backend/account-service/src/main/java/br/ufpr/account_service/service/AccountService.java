package br.ufpr.account_service.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
        rabbitTemplate.convertAndSend(accountEventsExchange, routingKey, event);
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
        accountRepository.deleteAll();
        transactionRepository.deleteAll();
    }
}
