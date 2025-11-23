package br.ufpr.account_query_service.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import br.ufpr.account_query_service.dto.DailyBalanceDTO;
import br.ufpr.account_query_service.dto.StatementItemDTO;
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
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Conta não encontrada para o CPF " + authenticatedCpf));
    }

    public AccountView getAccountByNumber(String accountNumber) {
        return accountViewRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Conta não encontrada para o número " + accountNumber));
    }

    public List<DailyBalanceDTO> getStatement(String accountNumber, String startDateStr, String endDateStr) {
        AccountView account = getAccountByNumber(accountNumber);
        LocalDate end = (endDateStr != null && !endDateStr.isBlank())
                ? LocalDate.parse(endDateStr)
                : LocalDate.now();
        LocalDate start = (startDateStr != null && !startDateStr.isBlank())
                ? LocalDate.parse(startDateStr)
                : end.minusDays(30);

        LocalDateTime startDateTime = start.atStartOfDay();
        LocalDateTime endDateTime = end.atTime(LocalTime.MAX);

        BigDecimal currentBalance = transactionViewRepository.getBalanceBefore(account.getId(), startDateTime);

        List<TransactionView> transactions = transactionViewRepository
                .findByAccountIdAndTimestampBetweenOrderByTimestampAsc(account.getId(), startDateTime, endDateTime);

        Map<LocalDate, List<TransactionView>> txByDate = transactions.stream()
                .collect(Collectors.groupingBy(t -> t.getTimestamp().toLocalDate()));

        List<DailyBalanceDTO> statement = new ArrayList<>();
        long daysBetween = ChronoUnit.DAYS.between(start, end);

        for (int i = 0; i <= daysBetween; i++) {
            LocalDate date = start.plusDays(i);
            List<TransactionView> dailyTxs = txByDate.getOrDefault(date, new ArrayList<>());
            List<StatementItemDTO> items = new ArrayList<>();

            for (TransactionView tx : dailyTxs) {
                currentBalance = currentBalance.add(tx.getAmount());

                String tipoMovimento = tx.getAmount().compareTo(BigDecimal.ZERO) >= 0 ? "depósito" : "saque";

                StatementItemDTO item = new StatementItemDTO();
                item.setDataHora(tx.getTimestamp());
                item.setOperacao(tx.getType());
                item.setTipo(tipoMovimento);
                item.setValor(tx.getAmount().abs());
                item.setOrigem(tx.getOriginClientId());
                item.setDestino(tx.getDestinationClientId());

                items.add(item);
            }

            DailyBalanceDTO daily = new DailyBalanceDTO();
            daily.setData(date);
            daily.setSaldoDoDia(currentBalance);
            daily.setMovimentacoes(items);

            statement.add(daily);
        }

        return statement;
    }

    public List<Object[]> getSummaryByManager() {
        return accountViewRepository.summaryByManager();
    }

    public List<AccountView> getTopAccountsByManager(String managerCpf, int limit) {
        if (managerCpf == null || managerCpf.isBlank() || limit <= 0) {
            return List.of();
        }
        return accountViewRepository.findTopAccountsByManager(managerCpf, limit);
    }

    public void rebuildAccountViews() {
        accountViewRepository.deleteAll();
    }
}