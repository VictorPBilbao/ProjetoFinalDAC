package br.ufpr.account_query_service.consumer;

import java.math.BigDecimal;
import java.time.ZoneId;
import java.util.Optional;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import br.ufpr.account_query_service.dto.AccountMessageDTO;
import br.ufpr.account_query_service.dto.TransactionMessageDTO;
import br.ufpr.account_query_service.model.AccountView;
import br.ufpr.account_query_service.model.TransactionView;
import br.ufpr.account_query_service.repository.AccountViewRepository;
import br.ufpr.account_query_service.repository.TransactionViewRepository;

@Component
public class CqrsListener {

    @Autowired
    private AccountViewRepository accountViewRepository;

    @Autowired
    private TransactionViewRepository transactionViewRepository;

    @RabbitListener(queues = "account-update-queue")
    public void onAccountUpdate(AccountMessageDTO accountDto) {

        Optional<AccountView> existing = accountViewRepository.findByClientId(accountDto.getClientCpf());
        AccountView view = existing.orElse(new AccountView());

        view.setClientId(accountDto.getClientCpf());
        view.setAccountNumber(accountDto.getNumero());
        view.setBalance(BigDecimal.valueOf(accountDto.getSaldo()));
        view.setLimit(BigDecimal.valueOf(accountDto.getLimite()));

        if (accountDto.getManagerCpf() != null) {
            view.setManagerId(accountDto.getManagerCpf());
        }

        if (accountDto.getDataCriacao() != null) {

            view.setCreationDate(accountDto.getDataCriacao().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
        }

        accountViewRepository.save(view);
    }

    @RabbitListener(queues = "transaction-created-queue")
    public void onTransaction(TransactionMessageDTO txDto) {
        TransactionView txView = new TransactionView();

        if (txDto.getDataHora() != null) {
            txView.setTimestamp(txDto.getDataHora().toInstant().atZone(ZoneId.systemDefault()).toLocalDateTime());
        }
        txView.setType(txDto.getTipo());
        txView.setAmount(BigDecimal.valueOf(txDto.getValor()));
        txView.setOriginClientId(txDto.getOrigemCpf());
        txView.setDestinationClientId(txDto.getDestinoCpf());

        String cpfDaConta = txDto.getOrigemCpf();
        if ("DEPOSITO".equals(txDto.getTipo())) {
            cpfDaConta = txDto.getDestinoCpf();
        }

        if (cpfDaConta != null) {
            Optional<AccountView> accountViewOpt = accountViewRepository.findByClientId(cpfDaConta);

            if (accountViewOpt.isPresent()) {
                txView.setAccountId(accountViewOpt.get().getId());
                transactionViewRepository.save(txView);
            } else {

            }
        }
    }
}
