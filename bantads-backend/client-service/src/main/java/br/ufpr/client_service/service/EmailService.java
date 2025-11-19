package br.ufpr.client_service.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import br.ufpr.client_service.exception.EmailSendException;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendRejectionEmail(String to, String clientName, String reason) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject("BANTADS - Solicitação de Cadastro Recusada");
            message.setText(buildRejectionMessage(clientName, reason));

            mailSender.send(message);
            logger.info("Email de rejeição enviado para: {}", to);
        } catch (MailException e) {
            logger.error("Erro ao enviar email de rejeição para: {}", to, e);
            throw new EmailSendException("Falha ao enviar email de rejeição", e);
        }
    }

    private String buildRejectionMessage(String clientName, String reason) {
        return String.format("""
                Prezado(a) %s,

                Informamos que sua solicitação de cadastro no BANTADS não foi aprovada.

                Motivo: %s

                Para mais informações, entre em contato com nossa central de atendimento.

                Atenciosamente,
                Equipe BANTADS
                """, clientName, reason != null ? reason : "Não especificado");
    }
}
