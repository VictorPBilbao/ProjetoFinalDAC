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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuário/Senha incorretos"));

        if (!passwordEncoder.matches(request.getSenha(), user.getSenha())) {
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
}