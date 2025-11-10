package br.ufpr.saga_orchestrator.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;
import java.util.stream.Collectors;

import br.ufpr.saga_orchestrator.result.SagaResult;

@Service
public class SagaService {

    private final WebClient webClient;
    private final String gatewayBase;
    private final String clientsEndpoint;
    private final String managersEndpoint;
    private final String notificationsEndpoint;
    private final String accountsEndpoint; // this method will use accounts endpoint in future implementations

    public SagaService(WebClient webClient,
            @Value("${api.gateway.base-url}") String gatewayBase,
            @Value("${clients.endpoint}") String clientsEndpoint,
            @Value("${managers.endpoint}") String managersEndpoint,
            @Value("${notifications.endpoint}") String notificationsEndpoint,
            @Value("${accounts.endpoint}") String accountsEndpoint) { // this method will use accounts endpoint in
                                                                      // future implementations
        this.webClient = webClient;
        this.gatewayBase = gatewayBase;
        this.clientsEndpoint = clientsEndpoint;
        this.managersEndpoint = managersEndpoint;
        this.notificationsEndpoint = notificationsEndpoint;
        this.accountsEndpoint = accountsEndpoint; // this method will use accounts endpoint in future implementations
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

    // this method will use accounts endpoint in future implementations
    // method to update client profile
    public SagaResult updateClientProfile(String clientId, Map<String, Object> clientUpdateData) {

        // update client data in Client MS
        // we need the endpoint updateLimitByClientId in Account MS to recalculate limit
        // if salary is updated
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

        // if salary is updated, we need to recalculate account limit in Account MS
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
                // rollback client update
                // this part is optional and can be implemented in futures
                // if updating account limit fails, we undo the client update

                //
                // try {
                // webClient.put()
                // .uri(gatewayBase + clientsEndpoint + "/" + clientId)
                // .contentType(MediaType.APPLICATION_JSON)
                // .bodyValue(oldClientData) // Restaura os dados antigos
                // .retrieve()
                // .toBodilessEntity()
                // .block();
                // } catch (Exception rollbackEx) {
                // return new SagaResult(false, "ACCOUNT_UPDATE_ROLLBACK_FAIL", "Falha ao
                // atualizar limite e falha ao reverter alteração do cliente.",
                // rollbackEx.getMessage());
                // }
                return new SagaResult(false, "ACCOUNT_UPDATE",
                        "Dados do cliente atualizados, mas falha ao recalcular limite no MS Conta", ex.getMessage());
            }
        }

        return new SagaResult(true, "completed", "Perfil do cliente e limite atualizados com sucesso", null);

    }

    public SagaResult createManagerSaga(Map<String, Object> managerDto) {
        Map<String, Object> createdManager;
        try {
            createdManager = webClient.post()
                    .uri(gatewayBase + managersEndpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(managerDto)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (Exception ex) {
            return new SagaResult(false, "create-manager", "Falha ao criar gerente", ex.getMessage());
        }

        if (createdManager == null || createdManager.get("id") == null) {
            return new SagaResult(false, "create-manager", "Gerente criado, porém resposta inválida", createdManager);
        }

        String newManagerId = createdManager.get("id").toString();

        List<Map<String, Object>> clients = fetchClientsSafe();
        List<Map<String, Object>> managers = fetchManagersSafe();

        try {
            Map<String, List<Map<String, Object>>> byManager = clients.stream()
                    .filter(c -> c.get("manager") != null)
                    .collect(Collectors.groupingBy(c -> {
                        Object mgr = c.get("manager");
                        if (mgr instanceof Map) {
                            Object id = ((Map<?, ?>) mgr).get("id");
                            return id != null ? id.toString() : "null";
                        }
                        return mgr.toString();
                    }));

            Optional<Map.Entry<String, List<Map<String, Object>>>> donorOpt = byManager.entrySet().stream()
                    .filter(e -> !e.getKey().equals(newManagerId))
                    .max(Comparator.comparingInt(e -> e.getValue().size()));

            if (donorOpt.isPresent()) {
                String donorId = donorOpt.get().getKey();
                int donorCount = donorOpt.get().getValue().size();
                int toMove = Math.max(0, donorCount / 2);
                if (toMove > 0) {
                    List<Map<String, Object>> donorClients = donorOpt.get().getValue();
                    List<String> clientsToMove = donorClients.stream()
                            .limit(toMove)
                            .map(c -> c.get("id").toString())
                            .collect(Collectors.toList());

                    List<String> moved = new ArrayList<>();
                    for (String clientId : clientsToMove) {
                        boolean ok = reassignClientToManager(clientId, newManagerId);
                        if (!ok) {
                            for (String mClientId : moved) {
                                reassignClientToManager(mClientId, donorId);
                            }
                            try {
                                webClient.delete()
                                        .uri(gatewayBase + managersEndpoint + "/" + newManagerId)
                                        .retrieve()
                                        .toBodilessEntity()
                                        .block();
                            } catch (Exception delEx) {

                                System.err.println("Compensação: falha ao deletar gerente após erro de reatribuição: "
                                        + delEx.getMessage());
                            }
                            return new SagaResult(false, "rebalance",
                                    "Falha ao reatribuir clientes após criação do gerente. Operação revertida.",
                                    clientId);
                        } else {
                            moved.add(clientId);
                        }
                    }
                }
            }

        } catch (Exception ex) {
            try {
                webClient.delete()
                        .uri(gatewayBase + managersEndpoint + "/" + newManagerId)
                        .retrieve()
                        .toBodilessEntity()
                        .block();
            } catch (Exception ignore) {
            }
            return new SagaResult(false, "create-manager", "Erro interno during rebalance, criação revertida",
                    ex.getMessage());
        }

        return new SagaResult(true, "create-manager", "Gerente criado e rebalance (se aplicável) finalizado",
                createdManager);
    }

    public SagaResult deleteManagerSaga(String managerId, String recipientIdOpt) {
        List<Map<String, Object>> managers = fetchManagersSafe();
        List<Map<String, Object>> clients = fetchClientsSafe();

        String recipientId = recipientIdOpt;
        if (recipientId == null || recipientId.isBlank()) {

            Map<String, Long> counts = new HashMap<>();
            for (Map<String, Object> c : clients) {
                Object mgr = c.get("manager");
                if (mgr instanceof Map) {
                    Object id = ((Map<?, ?>) mgr).get("id");
                    if (id != null)
                        counts.put(id.toString(), counts.getOrDefault(id.toString(), 0L) + 1);
                } else if (mgr != null) {
                    counts.put(mgr.toString(), counts.getOrDefault(mgr.toString(), 0L) + 1);
                }
            }
            Optional<String> opt = managers.stream()
                    .map(m -> m.get("id").toString())
                    .filter(id -> !id.equals(managerId))
                    .min(Comparator.comparingLong(id -> counts.getOrDefault(id, 0L)));
            if (opt.isPresent())
                recipientId = opt.get();
            else
                return new SagaResult(false, "delete-manager", "Nenhum gerente disponível para receber clientes.",
                        null);
        }

        List<String> clientsToReassign = clients.stream()
                .filter(c -> {
                    Object mgr = c.get("manager");
                    if (mgr instanceof Map) {
                        Object id = ((Map<?, ?>) mgr).get("id");
                        return id != null && id.toString().equals(managerId);
                    } else if (mgr != null) {
                        return mgr.toString().equals(managerId);
                    }
                    return false;
                })
                .map(c -> c.get("id").toString())
                .collect(Collectors.toList());

        List<String> reassigned = new ArrayList<>();
        try {
            for (String clientId : clientsToReassign) {
                boolean ok = reassignClientToManager(clientId, recipientId);
                if (!ok) {

                    for (String r : reassigned) {
                        reassignClientToManager(r, managerId);
                    }
                    return new SagaResult(false, "reassign", "Falha ao reatribuir clientes antes da exclusão.",
                            clientId);
                }
                reassigned.add(clientId);
            }

            webClient.delete()
                    .uri(gatewayBase + managersEndpoint + "/" + managerId)
                    .retrieve()
                    .toBodilessEntity()
                    .block();

        } catch (Exception ex) {

            for (String r : reassigned) {
                try {
                    reassignClientToManager(r, managerId);
                } catch (Exception ignore) {
                }
            }
            return new SagaResult(false, "delete-manager",
                    "Falha ao excluir gerente, rollback aplicado nas reatribuições", ex.getMessage());
        }

        return new SagaResult(true, "delete-manager", "Gerente excluído e clientes reatribuídos com sucesso",
                Map.of("reassigned", reassigned, "recipient", recipientId));
    }

    private List<Map<String, Object>> fetchClientsSafe() {
        try {
            List<Map<String, Object>> clients = webClient.get()
                    .uri(gatewayBase + clientsEndpoint)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();
            return clients == null ? Collections.emptyList() : clients;
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    private List<Map<String, Object>> fetchManagersSafe() {
        try {
            List<Map<String, Object>> managers = webClient.get()
                    .uri(gatewayBase + managersEndpoint)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();
            return managers == null ? Collections.emptyList() : managers;
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    private boolean reassignClientToManager(String clientId, String managerId) {
        try {
            webClient.put()
                    .uri(gatewayBase + clientsEndpoint + "/" + clientId + "/manager")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("managerId", managerId))
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            return true;
        } catch (Exception ex) {
            System.err.println(
                    "Falha ao reatribuir cliente " + clientId + " para manager " + managerId + " : " + ex.getMessage());
            return false;
        }
    }
}
