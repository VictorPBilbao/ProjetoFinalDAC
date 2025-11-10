package br.ufpr.account_service.controller;

import java.util.Map;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import br.ufpr.account_service.model.Account;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import br.ufpr.account_service.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping; // Novo Import

@RestController
@RequestMapping("/accounts")

public class AccountController {

    @Autowired
    private AccountService accountService;

    //PUT /accounts/client/{id}/update-limit
    @PutMapping("/client/{id}/update-limit")
    public ResponseEntity<Account> updateAccountLimit(
            @PathVariable("id") Long clientId,
            @RequestBody Map<String, Object> salaryData) {

        Account updatedAccount = accountService.updateLimitByClientId(clientId, salaryData);
        return ResponseEntity.ok(updatedAccount);
    }

    //GET /accounts/client/{id}
    @GetMapping("/client/{id}")
    public ResponseEntity<Account> getAccount(
            @PathVariable("id") Long clientId) {

        Account account = accountService.getAccountByClientId(clientId);
        return ResponseEntity.ok(account);
    }

}