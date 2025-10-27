package br.ufpr.client_service;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Serviço responsável por gerenciar operações relacionadas aos clientes.
 * 
 * Esta classe atua como camada intermediária entre o controller e o repository.
 * Nenhuma lógica de persistência é implementada aqui — os métodos da repository
 * ainda não são chamados e estão apenas indicados como comentários.
 */
@Service
public class ClientService {

    /**
     * Cria um novo cliente.
     * @param client Objeto Client contendo os dados do cliente a ser criado.
     * @return O cliente criado.
     */
    public Client createClient(Client client) {
        // TODO: Chamar o método save() da ClientRepository aqui
        System.out.println("[ClientService] Criando cliente: " + client.getNome());

        // Validação básica antes de persistir
        if (client.getCpf() == null || client.getCpf().isEmpty()) {
            throw new IllegalArgumentException("CPF do cliente é obrigatório.");
        }

        if (client.getEmail() == null || client.getEmail().isEmpty()) {
            throw new IllegalArgumentException("E-mail do cliente é obrigatório.");
        }

        // Definir data de cadastro e status inicial
        client.setAprovado(false);
        if (client.getDataCadastro() == null) {
            client.setDataCadastro(java.time.LocalDateTime.now());
        }

        // Retornar o cliente (mock, já que o repository ainda não é chamado)
        return client;
    }

    /**
     * Atualiza os dados de um cliente existente.
     * @param cpf CPF do cliente a ser atualizado.
     * @param updatedClient Dados atualizados do cliente.
     * @return O cliente atualizado.
     */
    public Client updateClient(String cpf, Client updatedClient) {
        System.out.println("[ClientService] Atualizando cliente de CPF: " + cpf);

        // TODO: Buscar cliente existente na repository e salvar alterações
        // Exemplo: Client existing = clientRepository.findByCpf(cpf).orElseThrow(...);

        if (cpf == null || cpf.isEmpty()) {
            throw new IllegalArgumentException("CPF inválido para atualização.");
        }

        // Mock de atualização
        updatedClient.setCpf(cpf);
        updatedClient.setAprovado(true);
        updatedClient.setDataCadastro(java.time.LocalDateTime.now());
        return updatedClient;
    }

    /**
     * Busca um cliente pelo CPF.
     * @param cpf CPF do cliente.
     * @return Optional contendo o cliente, se encontrado.
     */
    public Optional<Client> getClientByCpf(String cpf) {
        System.out.println("[ClientService] Buscando cliente de CPF: " + cpf);

        // TODO: Retornar cliente do repositório: clientRepository.findByCpf(cpf)
        // Mock: simulando retorno de cliente fictício
        if ("00000000000".equals(cpf)) {
            Client mockClient = new Client();
            mockClient.setCpf(cpf);
            mockClient.setNome("Cliente de Teste");
            mockClient.setEmail("teste@cliente.com");
            mockClient.setCidade("Curitiba");
            mockClient.setEstado("PR");
            mockClient.setAprovado(true);
            return Optional.of(mockClient);
        }

        return Optional.empty();
    }

    /**
     * Retorna todos os clientes cadastrados.
     * @return Lista de clientes.
     */
    public List<Client> getAllClients() {
        System.out.println("[ClientService] Listando todos os clientes...");

        // TODO: Retornar todos os clientes da repository: clientRepository.findAll()
        // Mock de lista
        List<Client> mockList = new ArrayList<>();

        Client c1 = new Client();
        c1.setCpf("11111111111");
        c1.setNome("Ana Souza");
        c1.setEmail("ana@teste.com");
        c1.setCidade("Curitiba");
        c1.setEstado("PR");
        c1.setAprovado(true);

        Client c2 = new Client();
        c2.setCpf("22222222222");
        c2.setNome("João Lima");
        c2.setEmail("joao@teste.com");
        c2.setCidade("São Paulo");
        c2.setEstado("SP");
        c2.setAprovado(false);

        mockList.add(c1);
        mockList.add(c2);

        return mockList;
    }

    /**
     * Deleta um cliente pelo CPF.
     * @param cpf CPF do cliente a ser removido.
     */
    public void deleteClient(String cpf) {
        System.out.println("[ClientService] Deletando cliente de CPF: " + cpf);

        // TODO: Chamar clientRepository.deleteById(cpf)
        if (cpf == null || cpf.isEmpty()) {
            throw new IllegalArgumentException("CPF inválido para exclusão.");
        }

        // Simula operação
        System.out.println("[ClientService] Cliente " + cpf + " removido (mock).");
    }
}
