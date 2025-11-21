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
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

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
                !StringUtils.hasText(dto.getEmail()) || !StringUtils.hasText(dto.getPassword())) {
            throw new IllegalArgumentException(
                    "Todos os campos (Nome, CPF, E-mail, Senha) são obrigatórios para criar um gerente.");
        }

        if (managerRepository.existsByCpf(dto.getCpf()) || managerRepository.existsByEmail(dto.getEmail())) {
            throw new DuplicateKeyException("CPF ou E-mail já cadastrado.");
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
    public Manager getManagerByCpf(String cpf) {
        Manager manager = managerRepository.findByCpf(cpf);
        if (manager == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Gerente não encontrado"
            );
        }
        return manager;
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

    @Transactional
    public void deleteManagerForRollback(String id) {
        Optional<Manager> manager = managerRepository.findById(id);
        if (manager.isPresent()) {
            managerRepository.delete(manager.get());
        }
    }

    @Transactional
    public Manager deleteManagerByCpf(String cpf) {
        Manager manager = managerRepository.findByCpf(cpf);
        if (manager == null) {
            throw new IllegalArgumentException("Gerente não encontrado.");
        }

        if (managerRepository.count() <= 1) {
            throw new IllegalStateException("Não é possível remover o último gerente do banco.");
        }

        Manager recipientManager = findRecipientManager(manager.getId());
        managerRepository.delete(manager);

        return manager;
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

        if (StringUtils.hasText(details.getCpf()) && !manager.getCpf().equals(details.getCpf())) {
            if (managerRepository.existsByCpf(details.getCpf())) {
                throw new IllegalArgumentException("O novo CPF já está em uso.");
            }
            manager.setCpf(details.getCpf());
        }

        if (StringUtils.hasText(details.getTelephone())) {
            manager.setTelephone(details.getTelephone());
        }

        if (StringUtils.hasText(details.getPassword())) {
            manager.setPassword(details.getPassword());
        }

        return managerRepository.save(manager);
    }

    public Manager findManagerWithLeastClients() {
        Map<String, Long> clientCounts = getManagerClientCountsFromClientService();
        return managerRepository.findAll().stream()
                .min(Comparator.comparingLong(m -> clientCounts.getOrDefault(m.getId(), 0L)))
                .orElseThrow(() -> new IllegalStateException("Nenhum gerente disponível"));
    }

    private Map<String, Long> getManagerClientCountsFromClientService() {
        return Map.of();
    }

    @Transactional
    public void reboot() {
        managerRepository.deleteAll();
    }
}