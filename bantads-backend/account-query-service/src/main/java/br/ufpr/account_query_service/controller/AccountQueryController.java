package br.ufpr.account_query_service.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.ufpr.account_query_service.dto.ManagerSummaryDTO;
import br.ufpr.account_query_service.model.AccountView;
import br.ufpr.account_query_service.model.TransactionView;
import br.ufpr.account_query_service.service.AccountQueryService;

@RestController
@RequestMapping("/query")
public class AccountQueryController {

    @Autowired
    private AccountQueryService accountQueryService;

    @GetMapping("/my-account")
    public ResponseEntity<AccountView> getMyAccount(
            @RequestHeader("X-User-CPF") String authenticatedCpf) {

        AccountView account = accountQueryService.getAccountByCpf(authenticatedCpf);
        return ResponseEntity.ok(account);
    }

    @GetMapping("/statement")
    public ResponseEntity<List<TransactionView>> getStatement(
            @RequestHeader("X-User-CPF") String authenticatedCpf,
            @RequestParam String startDate,
            @RequestParam String endDate) {

        List<TransactionView> statement = accountQueryService.getStatement(authenticatedCpf, startDate, endDate);
        return ResponseEntity.ok(statement);
    }

    @GetMapping("/summary-by-manager")
    public ResponseEntity<List<ManagerSummaryDTO>> getSummaryByManager() {
        List<Object[]> rows = accountQueryService.getSummaryByManager();
        List<ManagerSummaryDTO> result = rows.stream().map(r -> {
            String managerId = r[0] != null ? r[0].toString() : null;
            Long qtd = r[1] != null ? ((Number) r[1]).longValue() : 0L;
            Double totalPos = r[2] != null ? ((Number) r[2]).doubleValue() : 0.0;
            Double totalNeg = r[3] != null ? ((Number) r[3]).doubleValue() : 0.0;
            return new ManagerSummaryDTO(managerId, qtd, totalPos, totalNeg);
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

}
