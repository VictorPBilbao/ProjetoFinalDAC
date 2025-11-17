# BANTADS - Quick Start Guide

## ⚡ Quick Start (3 comandos)

```powershell
# 1. Navegue para o diretório do projeto
cd ProjetoFinalDAC

# 2. Execute o script de inicialização
.\start-project.ps1

# 3. Aguarde 1-2 minutos e acesse
# http://localhost
```

## 🌐 Acesso Rápido

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend** | http://localhost | Ver tabela abaixo |
| **API Gateway** | http://localhost:3000 | - |
| **RabbitMQ** | http://localhost:15672 | guest / guest |

## 👥 Usuários de Teste

### Cliente
```
Email: cli1@bantads.com.br
Senha: tads
```

### Gerente
```
Email: ger1@bantads.com.br
Senha: tads
```

### Administrador
```
Email: adm1@bantads.com.br
Senha: tads
```

## 🛑 Parar o Projeto

```powershell
.\stop-project.ps1
```

## 🔄 Reiniciar Completamente

```powershell
# Parar e remover volumes (limpa dados)
docker-compose down -v

# Reconstruir e iniciar
.\start-project.ps1
```

## 📋 Comandos Úteis

### Ver logs de um serviço
```powershell
docker-compose logs -f [nome-serviço]

# Exemplos:
docker-compose logs -f api-gateway
docker-compose logs -f client-service
docker-compose logs -f auth-service
```

### Ver status de todos os serviços
```powershell
docker-compose ps
```

### Reiniciar um serviço específico
```powershell
docker-compose restart [nome-serviço]
```

### Rebuild de um serviço
```powershell
docker-compose up -d --build [nome-serviço]
```

## 🐛 Problemas Comuns

### "Port already in use"
```powershell
# Identifique o processo usando a porta
netstat -ano | findstr :[PORTA]

# Mate o processo (substitua [PID] pelo número retornado)
taskkill /PID [PID] /F
```

### Serviço não inicia
```powershell
# Veja os logs do serviço
docker-compose logs -f [nome-serviço]

# Reconstrua o serviço
docker-compose up -d --build [nome-serviço]
```

### Limpar tudo e começar do zero
```powershell
docker-compose down -v
docker system prune -a
.\start-project.ps1
```

## 📊 Portas dos Serviços

| Serviço | Porta |
|---------|-------|
| Frontend | 80 |
| API Gateway | 3000 |
| Client Service | 8081 |
| Account Service | 8082 |
| Manager Service | 8083 |
| Auth Service | 8084 |
| Saga Orchestrator | 8085 |
| Account Query Service | 8086 |
| PostgreSQL | 5432 |
| MongoDB | 27017 |
| RabbitMQ | 5672 |
| RabbitMQ Management | 15672 |

## 🔍 Health Check

Após iniciar, verifique se os serviços estão rodando:

```powershell
# Ver containers em execução
docker-compose ps

# Todos devem estar com status "Up"
```

## 📝 Estrutura de Logs

Os logs seguem o padrão:
- **INFO**: Operações normais
- **DEBUG**: Informações detalhadas (mensageria, BD)
- **ERROR**: Erros que precisam atenção

## 🎯 Testes Rápidos

### 1. Teste de Login
```
URL: http://localhost
Email: cli1@bantads.com.br
Senha: tads
```

### 2. Teste de API
```powershell
# Fazer login via API
curl -X POST http://localhost:3000/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"cli1@bantads.com.br\",\"senha\":\"tads\"}'
```

### 3. RabbitMQ Management
```
URL: http://localhost:15672
User: guest
Pass: guest
```

Verifique as filas no painel "Queues".

## 💡 Dicas

1. **Primeira execução**: Pode levar 5-10 minutos (download de imagens + build)
2. **Execuções seguintes**: ~1-2 minutos
3. **RAM recomendada**: Mínimo 8GB
4. **Espaço em disco**: ~5GB para imagens e volumes

## 📞 Precisa de Ajuda?

Consulte o arquivo `README-DOCKER.md` para documentação completa.
