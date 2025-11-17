package br.ufpr.saga_orchestrator.result;

public class SagaResult {
    private boolean success;
    private String step;
    private String message;
    private Object detail;
    private int statusCode;

    public SagaResult() {
    }

    public SagaResult(boolean success, String step, String message, Object detail, int statusCode) {
        this.success = success;
        this.step = step;
        this.message = message;
        this.detail = detail;
        this.statusCode = statusCode;
    }

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public String getStep() {
        return step;
    }

    public void setStep(String step) {
        this.step = step;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Object getDetail() {
        return detail;
    }

    public void setDetail(Object detail) {
        this.detail = detail;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }
}