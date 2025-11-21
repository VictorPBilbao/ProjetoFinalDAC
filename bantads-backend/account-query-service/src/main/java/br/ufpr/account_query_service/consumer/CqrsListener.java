package br.ufpr.account_query_service.consumer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Map;
import java.util.Optional;

import org.springframework.amqp.core.Message;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;

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

    @Autowired
    private ObjectMapper objectMapper;

    @RabbitListener(queues = "account-update-queue")
    public void onAccountUpdate(Message message) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = objectMapper.readValue(message.getBody(), Map.class);

            String clientCpf = (String) payload.get("clientCpf");
            String numero = (String) payload.get("numero");
            Object saldoObj = payload.get("saldo");
            Object limiteObj = payload.get("limite");
            String managerCpf = (String) payload.get("managerCpf");
            Object dataCriacaoObj = payload.get("dataCriacao");

            Optional<AccountView> existing = accountViewRepository.findByClientId(clientCpf);
            AccountView view = existing.orElse(new AccountView());

            view.setClientId(clientCpf);
            view.setAccountNumber(numero);

            if (saldoObj != null) {
                view.setBalance(
                        saldoObj instanceof BigDecimal ? (BigDecimal) saldoObj : new BigDecimal(saldoObj.toString()));
            }

            if (limiteObj != null) {
                view.setLimit(
                        limiteObj instanceof BigDecimal ? (BigDecimal) limiteObj
                                : new BigDecimal(limiteObj.toString()));
            }

            if (managerCpf != null) {
                view.setManagerId(managerCpf);
            }

            if (dataCriacaoObj != null) {
                if (dataCriacaoObj instanceof Date) {
                    view.setCreationDate(((Date) dataCriacaoObj).toInstant()
                            .atZone(ZoneId.systemDefault()).toLocalDateTime());
                } else if (dataCriacaoObj instanceof LocalDateTime) {
                    view.setCreationDate((LocalDateTime) dataCriacaoObj);
                } else if (dataCriacaoObj instanceof String) {
                    view.setCreationDate(LocalDateTime.parse((String) dataCriacaoObj));
                }
            }

            accountViewRepository.save(view);
            System.out.println("Account view saved: " + view.getClientId() + " - " + view.getAccountNumber());
        } catch (Exception e) {
            System.err.println("Error processing account update: " + e.getMessage());
            e.printStackTrace();
        }
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
