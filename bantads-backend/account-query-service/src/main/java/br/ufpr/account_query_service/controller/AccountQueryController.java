package br.ufpr.account_query_service.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.ufpr.account_query_service.dto.DailyBalanceDTO;
import br.ufpr.account_query_service.dto.ManagerSummaryDTO;
import br.ufpr.account_query_service.model.AccountView;
import br.ufpr.account_query_service.service.AccountQueryService;
import br.ufpr.account_query_service.repository.AccountViewRepository;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/query")
public class AccountQueryController {

    @Autowired
    private AccountQueryService accountQueryService;
    @Autowired
    private AccountViewRepository accountViewRepository;

    @GetMapping("/contas/{numero}/extrato")
    public ResponseEntity<List<DailyBalanceDTO>> getExtrato(
            @PathVariable String numero,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {

        List<DailyBalanceDTO> statement = accountQueryService.getStatement(numero, startDate, endDate);
        return ResponseEntity.ok(statement);
    }

    @GetMapping("/my-account")
    public ResponseEntity<AccountView> getMyAccount(@RequestHeader("X-User-CPF") String authenticatedCpf) {
        return ResponseEntity.ok(accountQueryService.getAccountByCpf(authenticatedCpf));
    }

    @GetMapping("/account-by-cpf/{cpf}")
    public ResponseEntity<AccountView> getAccountByCpf(@PathVariable String cpf) {
        return ResponseEntity.ok(accountQueryService.getAccountByCpf(cpf));
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

    @GetMapping("/top-accounts")
    public ResponseEntity<List<AccountView>> getTopAccounts(
            @RequestParam(required = false) String managerCpf,
            @RequestParam(defaultValue = "3") int limit,
            @RequestHeader(value = "X-User-CPF", required = false) String xUserCpf) {

        String effectiveManagerCpf = (managerCpf != null && !managerCpf.isBlank()) ? managerCpf : xUserCpf;
        if (effectiveManagerCpf == null || effectiveManagerCpf.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(accountQueryService.getTopAccountsByManager(effectiveManagerCpf, limit));
    }

    @GetMapping("/all")
    public ResponseEntity<List<AccountView>> getAllAccounts() {
        return ResponseEntity.ok(accountViewRepository.findAll());
    }

    @PostMapping("/reboot")
    public ResponseEntity<String> rebootAccountViews() {
        accountQueryService.rebuildAccountViews();
        return ResponseEntity.ok("Account views rebuild initiated.");
    }
}