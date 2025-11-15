import br.ufpr.account_query_service.model.AccountView;
import br.ufpr.account_query_service.model.TransactionView;
import br.ufpr.account_query_service.service.AccountQueryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}