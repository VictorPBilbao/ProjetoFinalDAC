package br.ufpr.saga_orchestrator.service;

import br.ufpr.saga_orchestrator.result.SagaResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class SagaService {

    private final WebClient webClient;
    private final String gatewayBase;
    private final String clientsEndpoint;
    private final String managersEndpoint;
    private final String notificationsEndpoint;

    public SagaService(WebClient webClient,
            @Value("${api.gateway.base-url}") String gatewayBase,
            @Value("${clients.endpoint}") String clientsEndpoint,
            @Value("${managers.endpoint}") String managersEndpoint,
            @Value("${notifications.endpoint}") String notificationsEndpoint) {
        this.webClient = webClient;
        this.gatewayBase = gatewayBase;
        this.clientsEndpoint = clientsEndpoint;
        this.managersEndpoint = managersEndpoint;
        this.notificationsEndpoint = notificationsEndpoint;
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
}