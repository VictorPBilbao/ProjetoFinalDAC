package br.ufpr.auth_service.service;

import br.ufpr.auth_service.model.User;
import br.ufpr.auth_service.model.dto.LoginRequest;
import br.ufpr.auth_service.model.dto.LoginResponse;
import br.ufpr.auth_service.model.dto.LogoutResponse;
import br.ufpr.auth_service.repository.UserRepository;
import br.ufpr.auth_service.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.text.Normalizer;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    public LoginResponse login(LoginRequest request) {
        System.out.println("Tentativa de login para o usuário: " + request.getUsuario());
        User user = userRepository.findByEmail(request.getUsuario())
                .or(() -> {
                    System.out.println("Procurando usuário pelo email: " + request.getUsuario());
                    return userRepository.findByCpf(request.getUsuario());
                })
                .orElseThrow(() -> new RuntimeException("Usuário/Senha incorretos"));


        if (!passwordEncoder.matches(request.getSenha(), user.getSenha())) {
            System.out.println("Senha inválida para o usuário: " + request.getUsuario());
            throw new RuntimeException("Usuário/Senha incorretos");
        }

        if (!user.getAtivo()) {
            throw new RuntimeException("Usuário inativo");
        }

        String token = jwtUtil.generateToken(user.getCpf(), user.getEmail(), user.getTipo());

        return new LoginResponse(
                token,
                "bearer",
                user.getTipo(),
                new LoginResponse.UserInfo(user.getCpf(), user.getNome(), user.getEmail()));
    }

    public LogoutResponse logout(String token) {
        String cpf = jwtUtil.extractCpf(token.replace("Bearer ", ""));
        User user = userRepository.findByCpf(cpf)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado"));

        return new LogoutResponse(
                user.getCpf(),
                user.getNome(),
                user.getEmail(),
                user.getTipo());
    }

    public boolean validateToken(String token) {
        return jwtUtil.isTokenValid(token.replace("Bearer ", ""));
    }

    public void createUser(Map<String, String> userDto) {
        String cpf   = norm(userDto.get("cpf"));
        String nome  = norm(userDto.get("nome"));
        String email = norm(userDto.get("email"));
        String senha = norm(userDto.getOrDefault("senha", userDto.get("password")));
        String tipo  = norm(userDto.getOrDefault("tipo", userDto.get("role")));

        if (cpf == null)  throw new IllegalArgumentException("cpf é obrigatório");
        if (senha == null) throw new IllegalArgumentException("senha é obrigatória");
        if (tipo == null)  throw new IllegalArgumentException("tipo é obrigatório");

        log.info("Criando usuário Auth com CPF: {}, Nome: {}, Email: {}", cpf, nome, email);

        try {
            if (userRepository.findByCpf(cpf).isPresent()) {
                throw new DuplicateKeyException("CPF já cadastrado");
            }
            if (email != null && userRepository.findByEmail(email).isPresent()) {
                throw new DuplicateKeyException("Email já cadastrado");
            }

            User user = new User();
            user.setCpf(cpf);
            user.setNome(nome);
            user.setEmail(email);
            user.setSenha(passwordEncoder.encode(senha));
            user.setTipo(tipo);
            user.setAtivo(true);

            System.out.println("Salvando usuário: " + user);
            // use insert para evitar replace de documento antigo com cpf=null
            userRepository.insert(user);

        } catch (DuplicateKeyException e) {
            log.error("Erro de duplicidade ao salvar usuário: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("Erro inesperado ao salvar usuário", e);
            throw e;
        }
    }

    private String norm(String s) {
        if (s == null) return null;
        s = s.trim();
        return s.isEmpty() || "null".equalsIgnoreCase(s) ? null : s;
    }
    
    public void updateUser(String cpf, Map<String, String> updates) {
        User user = userRepository.findByCpf(cpf)
            .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        String nome = norm(updates.get("nome"));
        String email = norm(updates.get("email"));
        String senha = norm(updates.getOrDefault("senha", updates.get("password")));

        if (nome != null) user.setNome(nome);
        if (email != null) {
            if (userRepository.findByEmail(email).isPresent() && !email.equals(user.getEmail())) {
                throw new DuplicateKeyException("Email já está em uso");
            }
            user.setEmail(email);
        }
        if (senha != null) user.setSenha(passwordEncoder.encode(senha));

        userRepository.save(user);
        log.info("Usuário atualizado: CPF={}", cpf);
    }
    
    // Get All Users
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
}