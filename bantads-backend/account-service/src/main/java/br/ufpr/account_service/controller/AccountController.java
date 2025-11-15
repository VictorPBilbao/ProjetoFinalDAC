package br.ufpr.account_service.controller;

import br.ufpr.account_service.dto.TransactionRequestDTO;
import br.ufpr.account_service.dto.TransferRequestDTO;
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/accounts")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @PostMapping("/deposit")
    public ResponseEntity<Account> deposit(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransactionRequestDTO request) {

        Account updatedAccount = accountService.deposit(authenticatedCpf, request.getAmount());
        return ResponseEntity.ok(updatedAccount);
    }

    @PostMapping("/withdraw")
    public ResponseEntity<Account> withdraw(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransactionRequestDTO request) {

        Account updatedAccount = accountService.withdraw(authenticatedCpf, request.getAmount());
        return ResponseEntity.ok(updatedAccount);
    }

    @PostMapping("/transfer")
    public ResponseEntity<Account> transfer(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @Valid @RequestBody TransferRequestDTO request) {

        Account updatedAccount = accountService.transfer(
                authenticatedCpf,
                request.getDestinationAccountNumber(),
                request.getAmount());
        return ResponseEntity.ok(updatedAccount);
    }

}