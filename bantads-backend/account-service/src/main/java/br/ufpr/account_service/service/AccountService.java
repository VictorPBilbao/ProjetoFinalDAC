package br.ufpr.account_service.service;

import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository; // Injecting AccountRepository

    //method to update account limit based on new salary
    public Account updateLimitByClientId(Long clientId, Map<String, Object> salaryData) {
        //take the new salary (assuming it comes as Integer in cents)
        Integer newSalaryInteger = (Integer) salaryData.get("salario");
        if (newSalaryInteger == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Campo 'salario' é obrigatório.");
        }

        BigDecimal newSalary = BigDecimal.valueOf(newSalaryInteger.intValue());

        //find the account by CLIENT ID
        Account account = accountRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conta não encontrada para o cliente ID: " + clientId));

        //recalculate limit based on new salary
        BigDecimal newLimit = BigDecimal.ZERO;
        BigDecimal threshold1 = BigDecimal.valueOf(20000);

        if (newSalary.compareTo(threshold1) >= 0) {
            newLimit = newSalary.divide(BigDecimal.valueOf(2));
        }

        //if new limit is less than negative balance, adjust it
        BigDecimal currentBalance = account.getBalance();

        if (currentBalance.compareTo(BigDecimal.ZERO) < 0 && newLimit.compareTo(currentBalance.multiply(BigDecimal.valueOf(-1))) < 0) {
            newLimit = currentBalance.multiply(BigDecimal.valueOf(-1)); //adjust limit to cover negative balance
        }

        //update account limit
        account.setLimit(newLimit);
        return accountRepository.save(account);
    }

    /**
     * Busca a conta de um cliente pelo seu ID.
     * @param clientId O ID do cliente.
     * @return A conta do cliente.
     * @throws ResponseStatusException se a conta não for encontrada.
     */
    public Account getAccountByClientId(Long clientId) {
        return accountRepository.findByClientId(clientId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Conta não encontrada para o cliente ID: " + clientId));
    }

}