package br.ufpr.account_query_service.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.ufpr.account_query_service.model.AccountView;
import br.ufpr.account_query_service.model.TransactionView;
import br.ufpr.account_query_service.repository.AccountViewRepository;
import br.ufpr.account_query_service.repository.TransactionViewRepository;

@Service
public class AccountQueryService {

    @Autowired
    private AccountViewRepository accountViewRepository;

    @Autowired
    private TransactionViewRepository transactionViewRepository;

    public AccountView getAccountByCpf(String authenticatedCpf) {
        return accountViewRepository.findByClientId(authenticatedCpf)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conta não encontrada."));
    }

    public List<TransactionView> getStatement(String authenticatedCpf, String startDateStr, String endDateStr) {
        AccountView account = getAccountByCpf(authenticatedCpf);

        DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;
        LocalDateTime startDate = LocalDate.parse(startDateStr, formatter).atStartOfDay();
        LocalDateTime endDate = LocalDate.parse(endDateStr, formatter).atTime(LocalTime.MAX);

        return transactionViewRepository.findByAccountIdAndTimestampBetweenOrderByTimestampAsc(
                account.getId(), startDate, endDate);
    }

    public List<Object[]> getSummaryByManager() {
        return accountViewRepository.summaryByManager();
    }
}
