package br.ufpr.manager_service.service;

import br.ufpr.manager_service.model.ManagerDTO;
import br.ufpr.manager_service.model.Manager;
import br.ufpr.manager_service.repository.ManagerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ManagerService {

    @Autowired
    private ManagerRepository managerRepository;

    @Transactional(readOnly = true)
    public List<Manager> getAllManagers() {
        return managerRepository.findAllByOrderByNameAsc();
    }

    @Transactional
    public Manager createManager(ManagerDTO dto) {
        if (!StringUtils.hasText(dto.getName()) || !StringUtils.hasText(dto.getCpf()) ||
                !StringUtils.hasText(dto.getEmail()) || !StringUtils.hasText(dto.getTelephone()) ||
                !StringUtils.hasText(dto.getPassword())) {
            throw new IllegalArgumentException(
                    "Todos os campos (Nome, CPF, E-mail, Telefone, Senha) são obrigatórios para criar um gerente.");
        }

        if (managerRepository.existsByCpf(dto.getCpf()) || managerRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("CPF ou E-mail já cadastrado.");
        }

        Manager manager = new Manager();
        manager.setName(dto.getName());
        manager.setCpf(dto.getCpf());
        manager.setEmail(dto.getEmail());
        manager.setTelephone(dto.getTelephone());
        manager.setPassword(dto.getPassword());

        Manager newManager = managerRepository.save(manager);

        List<Manager> allManagers = managerRepository.findAll();
        if (allManagers.size() > 1) {
            findDonorManager(newManager.getId()).ifPresent(donor -> {

            });
        }
        return newManager;
    }

    @Transactional(readOnly = true)
    public Manager getManagerById(String id) {
        return managerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Gerente não encontrado."));
    }

    private Optional<Manager> findDonorManager(String newManagerId) {
        Map<String, Long> clientCounts = getManagerClientCountsFromClientService();
        List<Manager> candidates = managerRepository.findAll().stream()
                .filter(m -> !m.getId().equals(newManagerId)).toList();

        if (candidates.isEmpty())
            return Optional.empty();

        long maxClients = candidates.stream()
                .mapToLong(m -> clientCounts.getOrDefault(m.getId(), 0L))
                .max().orElse(0);

        if (maxClients <= 1)
            return Optional.empty();

        List<Manager> topManagers = candidates.stream()
                .filter(m -> clientCounts.getOrDefault(m.getId(), 0L) == maxClients).toList();

        return topManagers.stream().findFirst();
    }

    @Transactional
    public void deleteManager(String id) {
        if (managerRepository.count() <= 1) {
            throw new IllegalStateException("Não é possível remover o último gerente do banco.");
        }
        Manager managerToDelete = managerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Gerente não encontrado."));

        Manager recipientManager = findRecipientManager(id);

        managerRepository.delete(managerToDelete);
    }

    private Manager findRecipientManager(String excludeManagerId) {
        Map<String, Long> clientCounts = getManagerClientCountsFromClientService();
        return managerRepository.findAll().stream()
                .filter(m -> !m.getId().equals(excludeManagerId))
                .min(Comparator.comparingLong(m -> clientCounts.getOrDefault(m.getId(), 0L)))
                .orElseThrow(() -> new IllegalStateException("Nenhum gerente disponível."));
    }

    @Transactional
    public Manager updateManager(String cpf, ManagerDTO details) {
        Manager manager = managerRepository.findByCpf(cpf);

        if (manager == null) {
            throw new IllegalArgumentException("Gerente não encontrado.");
        }

        if (StringUtils.hasText(details.getName())) {
            manager.setName(details.getName());
        }
        if (StringUtils.hasText(details.getEmail())) {
            if (!manager.getEmail().equals(details.getEmail()) && managerRepository.existsByEmail(details.getEmail())) {
                throw new IllegalArgumentException("O novo e-mail já está em uso.");
            }
            manager.setEmail(details.getEmail());
        }
        if (StringUtils.hasText(details.getPassword())) {
            manager.setPassword(details.getPassword());
        }

        return managerRepository.save(manager);
    }
    //

    private Map<String, Long> getManagerClientCountsFromClientService() {
        return Map.of();
    }
}