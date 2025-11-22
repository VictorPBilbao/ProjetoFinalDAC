package br.ufpr.account_service.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.account_service.dto.BalanceDTO;
import br.ufpr.account_service.dto.TransactionRequestDTO;
import br.ufpr.account_service.dto.TransferRequestDTO;
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.service.AccountService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/contas")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @GetMapping("/{id}/saldo")
    public ResponseEntity<BalanceDTO> getBalance(@PathVariable("id") String accountNumber) {
        BalanceDTO balanceDTO = accountService.getBalance(accountNumber);
        return ResponseEntity.ok(balanceDTO);
    }

    @PostMapping("/{id}/depositar")
    public ResponseEntity<Account> deposit(
            @PathVariable("id") String id,
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransactionRequestDTO request) {

        Account updatedAccount = accountService.deposit(authenticatedCpf, request.getValor());
        return ResponseEntity.ok(updatedAccount);
    }

    @PostMapping("/{conta}/sacar")
    public ResponseEntity<Account> withdraw(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransactionRequestDTO request) {

        Account updatedAccount = accountService.withdraw(authenticatedCpf, request.getValor());

        return ResponseEntity.ok(updatedAccount);
    }

    @PostMapping("/{conta}/transferir")
    public ResponseEntity<Map<String, Object>> transfer(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransferRequestDTO request) {

        Account updatedAccount = accountService.transfer(
                authenticatedCpf,
                request.getDestinationAccountNumber(),
                request.getValor());

        Map<String, Object> response = new HashMap<>();
        response.put("conta", updatedAccount.getAccountNumber());
        response.put("saldo", updatedAccount.getBalance());
        response.put("destino", request.getDestinationAccountNumber());
        response.put("valor", request.getValor());
        response.put("data", LocalDateTime.now().toString());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reboot")
    public ResponseEntity<Boolean> rebootAccounts() {
        try {
            accountService.rebootAccounts();
            return ResponseEntity.status(200).body(true);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(false);
        }
    }
}
