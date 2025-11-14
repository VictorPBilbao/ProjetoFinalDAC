package br.ufpr.saga_orchestrator.service;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import br.ufpr.saga_orchestrator.result.SagaResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class SagaService {

    private final WebClient webClient;
    private final String gatewayBase;
    private final String clientsEndpoint;
    private final String managersEndpoint;
    private final String notificationsEndpoint;
    private final String accountsEndpoint;
    private final String authEndpoint;
    private static final Logger log = LoggerFactory.getLogger(SagaService.class);

    public SagaService(
            WebClient webClient,
            @Value("${api.gateway.base-url:}") String gatewayBase,
            @Value("${clients.endpoint}") String clientsEndpoint,
            @Value("${managers.endpoint}") String managersEndpoint,
            @Value("${notifications.endpoint:}") String notificationsEndpoint,
            @Value("${accounts.endpoint}") String accountsEndpoint,
            @Value("${auth.endpoint}") String authEndpoint) {
        this.webClient = webClient;
        this.gatewayBase = gatewayBase;
        this.clientsEndpoint = clientsEndpoint;
        this.managersEndpoint = managersEndpoint;
        this.notificationsEndpoint = notificationsEndpoint;
        this.accountsEndpoint = accountsEndpoint;
        this.authEndpoint = authEndpoint;
    }

    /**
     * Cria um gerente e em seguida cria o usuário correspondente no Auth Service.
     */
    public SagaResult createManagerSaga(Map<String, Object> managerDto, String authorizationHeader) {
        Map<String, Object> createdManager;

        // 1. Criar gerente no Manager Service
        try {
            String managersBase = resolve(managersEndpoint);

            createdManager = webClient.post()
                    .uri(managersBase)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", authorizationHeader)
                    .bodyValue(managerDto)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();
        } catch (WebClientResponseException ex) {
            String errorBody = ex.getResponseBodyAsString();
            String errorMessage = "Falha ao criar gerente";

            try {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(errorBody);
                if (node.has("message")) {
                    errorMessage = node.get("message").asText();
                }
            } catch (Exception ignore) {}

            return new SagaResult(false, "create-manager", errorMessage, errorBody);
        } catch (Exception ex) {
            return new SagaResult(false, "create-manager",
                    "Erro ao comunicar com Manager Service", ex.getMessage());
        }

        // 2. Montar payload para Auth Service (compatível com createUser)
        Map<String, String> authPayload = new HashMap<>();
        String cpf   = createdManager.get("cpf").toString();
        String nome  = createdManager.get("name").toString();
        String email = createdManager.get("email").toString();
        String senha = createdManager.get("password").toString();
        String tipo  = "MANAGER";

        System.out.println("Criando usuário Auth para gerente: " + createdManager);
        authPayload.put("cpf", cpf);
        authPayload.put("nome", nome);
        authPayload.put("email", email);
        authPayload.put("senha", senha);
        authPayload.put("tipo", tipo);

        // 3. Criar usuário no Auth Service
        try {
            String authBase = resolve(authEndpoint);

            Map<?, ?> authResp = webClient.post()
                    .uri(authBase + "/create-user")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", authorizationHeader)
                    .bodyValue(authPayload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            Map<String, Object> result = new HashMap<>();
            result.put("manager", createdManager);
            result.put("authUser", authResp);

            return new SagaResult(true, "create-manager",
                    "Gerente e credenciais criados com sucesso", result);

        } catch (WebClientResponseException ex) {
            rollbackManager(createdManager, authorizationHeader);

            String errorBody = ex.getResponseBodyAsString();
            String errorMessage = "Falha ao criar usuário no Auth";

            try {
                ObjectMapper mapper = new ObjectMapper();
                JsonNode node = mapper.readTree(errorBody);
                if (node.has("message")) {
                    errorMessage = node.get("message").asText();
                }
            } catch (Exception ignore) {}

            return new SagaResult(false, "create-auth-user", errorMessage, errorBody);
        } catch (Exception ex) {
            rollbackManager(createdManager, authorizationHeader);
            return new SagaResult(false, "create-auth-user",
                    "Erro ao comunicar com Auth Service", ex.getMessage());
        }
    }

    /**
     * Remove o gerente criado caso falhe a criação do usuário no Auth.
     */
    private void rollbackManager(Map<String, Object> createdManager, String authorizationHeader) {
        Object id = createdManager != null ? createdManager.get("id") : null;
        if (id == null) return;
        try {
            String managersBase = resolve(managersEndpoint);
            webClient.delete()
                    .uri(managersBase + "/" + id)
                    .header("Authorization", authorizationHeader)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            System.out.println("Rollback realizado: gerente " + id + " removido.");
        } catch (Exception ex) {
            System.err.println("Falha ao realizar rollback do gerente: " + ex.getMessage());
        }
    }

    /**
     * Resolve endpoint absoluto ou prefixado pelo gateway.
     */
    private String resolve(String endpoint) {
        if (endpoint == null) return null;
        return endpoint.startsWith("http") ? endpoint : (gatewayBase != null ? gatewayBase + endpoint : endpoint);
    }

    // Update manager saga
    public SagaResult updateManagerSaga(String managerId, Map<String, Object> managerDto, String authorizationHeader) {
        Map<String, Object> previousManagerState = null;
        Map<String, Object> updatedManager = null;

        log.info("Iniciando updateManagerSaga para managerId: {}", managerId);

        try {
            String managersBase = resolve(managersEndpoint);

            // 0. Buscar estado atual do gerente (para rollback)
            try {
                previousManagerState = webClient.get()
                        .uri(managersBase + "/" + managerId)
                        .header("Authorization", authorizationHeader)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();
            } catch (WebClientResponseException ex) {
                String err = extractMessageFromBody(ex.getResponseBodyAsString(), "Falha ao buscar gerente atual");
                return new SagaResult(false, "fetch-manager", err, ex.getResponseBodyAsString());
            } catch (Exception ex) {
                return new SagaResult(false, "fetch-manager", "Erro ao comunicar com Manager Service", ex.getMessage());
            }

            if (previousManagerState == null) {
                return new SagaResult(false, "fetch-manager", "Gerente não encontrado", null);
            }

            // 1. Atualizar gerente no Manager Service
            try {
                updatedManager = webClient.put()
                        .uri(managersBase + "/" + managerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorizationHeader)
                        .bodyValue(managerDto)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();
            } catch (WebClientResponseException ex) {
                String err = extractMessageFromBody(ex.getResponseBodyAsString(), "Falha ao atualizar gerente");
                return new SagaResult(false, "update-manager", err, ex.getResponseBodyAsString());
            } catch (Exception ex) {
                return new SagaResult(false, "update-manager", "Erro ao comunicar com Manager Service", ex.getMessage());
            }

            if (updatedManager == null) {
                // nada foi atualizado no Manager — nada a fazer
                return new SagaResult(false, "update-manager", "Manager Service retornou vazio ao atualizar", null);
            }

            // 2. Preparar payload para o Auth Service
            // assume que o gerente contém cpf, email, name, password/optional
            Object cpfObj = updatedManager.get("cpf");
            String cpf = cpfObj != null ? cpfObj.toString().trim() : null;
            String nome = updatedManager.get("name") != null ? updatedManager.get("name").toString().trim() : null;
            String email = updatedManager.get("email") != null ? updatedManager.get("email").toString().trim().toLowerCase() : null;
            // se a senha não for retornada pelo manager, não sobrescreve a senha no Auth
            String senha = updatedManager.get("password") != null ? updatedManager.get("password").toString() : null;

            if (cpf == null || cpf.isBlank()) {
                // CPF ausente: algo de errado no manager atualizado; faz rollback e retorna erro
                rollbackManagerUpdate(managerId, previousManagerState, authorizationHeader);
                return new SagaResult(false, "update-auth-user", "CPF ausente após atualização do Manager", null);
            }

            Map<String, Object> authPayload = new HashMap<>();
            authPayload.put("cpf", cpf);
            if (nome != null) authPayload.put("nome", nome);
            if (email != null) authPayload.put("email", email);
            if (senha != null) authPayload.put("senha", senha);
            // tipo provavelmente não muda, mas você pode enviar se quiser:
            authPayload.put("tipo", "MANAGER");

            // 3. Atualizar usuário no Auth Service
            try {
                String authBase = resolve(authEndpoint);
                // supondo que exista endpoint PUT /users/{cpf} ou similar — ajuste conforme sua API do Auth
                Map<?, ?> authResp = webClient.put()
                        .uri(authBase + "/update-user/" + cpf) // adapte a rota se necessário
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", authorizationHeader)
                        .bodyValue(authPayload)
                        .retrieve()
                        .bodyToMono(Map.class)
                        .block();

                Map<String, Object> result = new HashMap<>();
                result.put("manager", updatedManager);
                result.put("authUser", authResp);

                return new SagaResult(true, "update-manager", "Gerente e usuário atualizados com sucesso", result);

            } catch (WebClientResponseException ex) {
                // se falhar no Auth, desfaz a alteração no Manager
                rollbackManagerUpdate(managerId, previousManagerState, authorizationHeader);

                String errorBody = ex.getResponseBodyAsString();
                int status = ex.getRawStatusCode();
                String errorMessage = extractMessageFromBody(errorBody, "Falha ao atualizar usuário no Auth");

                // se for conflito/duplicidade, sinalize adequadamente
                if (status == 409 || errorMessage.toLowerCase().contains("cpf") || errorMessage.toLowerCase().contains("email")) {
                    return new SagaResult(false, "update-auth-user", "Duplicidade ao atualizar usuário: " + errorMessage, errorBody);
                }

                return new SagaResult(false, "update-auth-user", errorMessage, errorBody);
            } catch (Exception ex) {
                rollbackManagerUpdate(managerId, previousManagerState, authorizationHeader);
                return new SagaResult(false, "update-auth-user", "Erro ao comunicar com Auth Service", ex.getMessage());
            }

        } catch (Exception e) {
            // erro geral inesperado
            log.error("Erro inesperado em updateManagerSaga", e);
            // se já atualizamos o manager e temos previousManagerState, tenta rollback
            if (previousManagerState != null && updatedManager != null) {
                rollbackManagerUpdate(managerId, previousManagerState, authorizationHeader);
            }
            return new SagaResult(false, "update-manager", "Erro interno ao atualizar gerente", e.getMessage());
        }
    }

    /**
     * Restaura o estado anterior do gerente no Manager Service.
     */
    private void rollbackManagerUpdate(String managerId, Map<String, Object> previousState, String authorizationHeader) {
        if (previousState == null) {
            log.warn("Rollback solicitado mas estado anterior é nulo, managerId={}", managerId);
            return;
        }

        try {
            String managersBase = resolve(managersEndpoint);
            webClient.put()
                    .uri(managersBase + "/" + managerId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", authorizationHeader)
                    .bodyValue(previousState)
                    .retrieve()
                    .toBodilessEntity()
                    .block();
            log.info("Rollback bem sucedido: gerente {} restaurado para estado anterior", managerId);
        } catch (Exception ex) {
            log.error("Falha ao realizar rollback do gerente {}: {}", managerId, ex.getMessage(), ex);
        }
    }

    /**
     * Helper para extrair "message" do corpo JSON sem falhar.
     */
    private String extractMessageFromBody(String body, String defaultMsg) {
        if (body == null || body.isBlank()) return defaultMsg;
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(body);
            if (node.has("message")) return node.get("message").asText();
            if (node.has("error")) return node.get("error").asText();
        } catch (Exception e) {
            // ignora
        }
        return defaultMsg;
    }

}
