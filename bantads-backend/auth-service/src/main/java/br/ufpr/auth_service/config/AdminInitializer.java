package br.ufpr.auth_service.config;

import br.ufpr.auth_service.model.User;
import br.ufpr.auth_service.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public void run(String... args) {
        String adminCpf = "40501740066";
        
        if (userRepository.existsByCpf(adminCpf) || userRepository.existsByEmail("admin@admin")) {
            System.out.println("[INIT] Admin já existe: " + adminCpf);
            return;
        }

        User admin = new User();
        admin.setCpf(adminCpf);
        admin.setNome("Adamântio");
        admin.setEmail("adm1@bantads.com.br");
        admin.setSenha(passwordEncoder.encode("tads"));
        admin.setTipo("ADMINISTRADOR");
        admin.setAtivo(true);

        userRepository.save(admin);
        System.out.println("[INIT] Usuário admin criado: login=admin@admin / senha=admin");
    }
}