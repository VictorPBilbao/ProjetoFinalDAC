package br.ufpr.saga_orchestrator.service;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import br.ufpr.saga_orchestrator.result.SagaResult;

@Service
public class SagaService {

    private final WebClient webClient;
    private final String gatewayBase;
    private final String clientsEndpoint;
    private final String managersEndpoint;
    private final String notificationsEndpoint;
    private final String accountsEndpoint; //this method will use accounts endpoint in future implementations

    public SagaService(WebClient webClient,
            @Value("${api.gateway.base-url}") String gatewayBase,
            @Value("${clients.endpoint}") String clientsEndpoint,
            @Value("${managers.endpoint}") String managersEndpoint,
            @Value("${notifications.endpoint}") String notificationsEndpoint,
            @Value("${accounts.endpoint}") String accountsEndpoint) { //this method will use accounts endpoint in future implementations
        this.webClient = webClient;
        this.gatewayBase = gatewayBase;
        this.clientsEndpoint = clientsEndpoint;
        this.managersEndpoint = managersEndpoint;
        this.notificationsEndpoint = notificationsEndpoint;
        this.accountsEndpoint = accountsEndpoint; //this method will use accounts endpoint in future implementations
    }

    public SagaResult approveClient(String clientId, String managerId, String password) {
        Map<String, Object> clientResp;
        try {
            clientResp = webClient.post()
                    .uri(gatewayBase + clientsEndpoint + "/" + clientId + "/approve")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("managerId", managerId, "password", password))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception ex) {
            return new SagaResult(false, "approve-client", "Falha ao aprovar cliente no Client Service",
                    ex.getMessage());
        }

        Map<String, Object> managerInfo = null;
        try {
            managerInfo = webClient.get()
                    .uri(gatewayBase + managersEndpoint + "/" + managerId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception ex) {

            managerInfo = Map.of("warning", "Não foi possível obter dados do gerente: " + ex.getMessage());
        }

        try {
            String managerEmail = managerInfo != null && managerInfo.get("email") != null
                    ? managerInfo.get("email").toString()
                    : "unknown@";
            Map<String, Object> mail = Map.of(
                    "to", managerEmail,
                    "subject", "Novo cliente aprovado",
                    "body", "O cliente " + clientId + " foi aprovado e atribuído a você.");
            webClient.post()
                    .uri(gatewayBase + notificationsEndpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(mail)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
        } catch (Exception ex) {

            return new SagaResult(true, "notify", "Cliente aprovado, mas falha ao notificar gerente", ex.getMessage());
        }

        return new SagaResult(true, "completed", "Cliente aprovado e gerente notificado",
                Map.of("client", clientResp, "manager", managerInfo));
    }

    //this method will use accounts endpoint in future implementations
    //method to update client profile
    public SagaResult updateClientProfile(String clientId, Map<String, Object> clientUpdateData) {

        //update client data in Client MS
        //we need the endpoint updateLimitByClientId in Account MS to recalculate limit if salary is updated
        try {
            webClient.put()
                    .uri(gatewayBase + clientsEndpoint + "/" + clientId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(clientUpdateData)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception ex) {
            return new SagaResult(false, "CLIENT_UPDATE", "Falha ao atualizar dados no MS Cliente", ex.getMessage());
        }

        //if salary is updated, we need to recalculate account limit in Account MS
        if (clientUpdateData.containsKey("salario")) {
            try {

                Object novoSalario = clientUpdateData.get("salario");

                webClient.put()
                        .uri(gatewayBase + accountsEndpoint + "/client/" + clientId + "/update-limit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .bodyValue(Map.of("salario", novoSalario))
                        .retrieve()
                        .toBodilessEntity()
                        .block();

            } catch (Exception ex) {
                //rollback client update
                //this part is optional and can be implemented in futures
                //if updating account limit fails, we undo the client update

                //
                // try {
                //     webClient.put()
                //             .uri(gatewayBase + clientsEndpoint + "/" + clientId)
                //             .contentType(MediaType.APPLICATION_JSON)
                //             .bodyValue(oldClientData) // Restaura os dados antigos
                //             .retrieve()
                //             .toBodilessEntity()
                //             .block();
                // } catch (Exception rollbackEx) {
                //     return new SagaResult(false, "ACCOUNT_UPDATE_ROLLBACK_FAIL", "Falha ao atualizar limite e falha ao reverter alteração do cliente.", rollbackEx.getMessage());
                // }
                return new SagaResult(false, "ACCOUNT_UPDATE", "Dados do cliente atualizados, mas falha ao recalcular limite no MS Conta", ex.getMessage());
            }
        }

        return new SagaResult(true, "completed", "Perfil do cliente e limite atualizados com sucesso", null);

    }

}
