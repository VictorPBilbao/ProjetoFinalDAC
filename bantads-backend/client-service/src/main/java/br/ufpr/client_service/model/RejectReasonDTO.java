package br.ufpr.client_service.model;
import jakarta.validation.constraints.NotBlank;

public class RejectReasonDTO {
    
    @NotBlank(message = "O motivo da rejeição é obrigatório.")
    private String motivo;

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }
}