package br.ufpr.account_service.controller;

import br.ufpr.account_service.dto.BalanceDTO;
import br.ufpr.account_service.dto.TransactionRequestDTO;
import br.ufpr.account_service.dto.TransferRequestDTO;
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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

    @PostMapping("/depositar")
    public ResponseEntity<Account> deposit(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransactionRequestDTO request) {

        Account updatedAccount = accountService.deposit(authenticatedCpf, request.getAmount());
        return ResponseEntity.ok(updatedAccount);
    }

    @PostMapping("/sacar")
    public ResponseEntity<Account> withdraw(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransactionRequestDTO request) {

        Account updatedAccount = accountService.withdraw(authenticatedCpf, request.getAmount());
        return ResponseEntity.ok(updatedAccount);
    }

    @PostMapping("/transferir")
    public ResponseEntity<Account> transfer(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransferRequestDTO request) {

        Account updatedAccount = accountService.transfer(
                authenticatedCpf,
                request.getDestinationAccountNumber(),
                request.getAmount());
        return ResponseEntity.ok(updatedAccount);
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
