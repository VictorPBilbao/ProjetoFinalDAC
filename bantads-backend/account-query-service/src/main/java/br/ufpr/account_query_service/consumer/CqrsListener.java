package main.java.br.ufpr.account_query_service.consumer;

import br.ufpr.account_query_service.model.AccountView;
import br.ufpr.account_query_service.model.TransactionView;
import br.ufpr.account_query_service.repository.AccountViewRepository;
import br.ufpr.account_query_service.repository.TransactionViewRepository;

// Importa os modelos do serviço de COMANDO (eles vêm na mensagem)
import br.ufpr.account_service.model.Account;
import br.ufpr.account_service.model.Transaction;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.annotation.RabbitHandler;
import org.springframework.amqp.rabbit.annotation.EnableRabbit;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@EnableRabbit
@RabbitListener(queues = "${rabbit.account.events.queue}")
public class CqrsListener {

    @Autowired
    private AccountViewRepository accountViewRepository;
    @Autowired
    private TransactionViewRepository transactionViewRepository;

    @RabbitHandler
    public void handleAccountEvent(@Payload Account accountEvent) {
        AccountView view = accountViewRepository.findByClientId(accountEvent.getClientId())
                .orElse(new AccountView());

        view.setClientId(accountEvent.getClientId());
        view.setAccountNumber(accountEvent.getAccountNumber());
        view.setBalance(accountEvent.getBalance());
        view.setLimit(accountEvent.getLimit());
        view.setManagerId(accountEvent.getManager());
        view.setCreationDate(accountEvent.getCreationDate());

        accountViewRepository.save(view);
    }

    @RabbitHandler
    public void handleTransactionEvent(@Payload Transaction txEvent) {
        AccountView accountView = accountViewRepository.findByClientId(txEvent.getAccount().getClientId())
                .orElse(null);

        if (accountView == null) {

            System.err.println("Conta " + txEvent.getAccount().getClientId() + " não encontrada para a transação "
                    + txEvent.getId());
            return;
        }

        TransactionView txView = new TransactionView();
        txView.setAccountId(accountView.getId());
        txView.setTimestamp(txEvent.getTimestamp());
        txView.setType(txEvent.getType());
        txView.setAmount(txEvent.getAmount());
        txView.setOriginClientId(txEvent.getOriginClientId());
        txView.setDestinationClientId(txEvent.getDestinationClientId());

        transactionViewRepository.save(txView);
    }
}