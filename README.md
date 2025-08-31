# Sistema de Gestão Hospitalar e de Serviços de Saúde (SGHSS)

## 📋 Descrição

O SGHSS é um sistema backend completo para gestão hospitalar desenvolvido em Node.js, focado em segurança, compliance LGPD e auditoria. O sistema oferece funcionalidades para gerenciamento de pacientes, profissionais de saúde, consultas e auditoria completa.

## 🏗️ Arquitetura

### Tecnologias Utilizadas
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **SQLite** - Banco de dados (desenvolvimento)
- **Sequelize** - ORM para banco de dados
- **JWT** - Autenticação por tokens
- **bcryptjs** - Hash de senhas
- **Winston** - Sistema de logs
- **Helmet** - Segurança HTTP
- **express-rate-limit** - Rate limiting
- **express-validator** - Validação de dados

### Estrutura do Projeto
```
src/
├── app.js                 # Aplicação principal
├── config/
│   └── database.js        # Configuração do banco
├── models/               # Modelos do banco de dados
│   ├── Usuario.js
│   ├── Paciente.js
│   ├── Profissional.js
│   ├── Consulta.js
│   └── AuditLog.js
├── controllers/          # Controladores
│   ├── AuthController.js
│   ├── PacienteController.js
│   ├── ProfissionalController.js
│   ├── ConsultaController.js
│   └── AuditController.js
├── middleware/          # Middlewares
│   ├── auth.js
│   ├── rateLimiter.js
│   ├── validation.js
│   └── errorHandler.js
├── routes/             # Rotas da API
│   ├── index.js
│   ├── auth.js
│   ├── pacientes.js
│   ├── profissionais.js
│   ├── consultas.js
│   └── audit.js
└── utils/              # Utilitários
    ├── encryption.js
    └── logger.js
```

## 🔐 Segurança e Compliance

### LGPD (Lei Geral de Proteção de Dados)
- ✅ Criptografia de dados sensíveis (CPF, RG, telefones)
- ✅ Anonimização de dados
- ✅ Controle de consentimento
- ✅ Auditoria completa de acesso aos dados
- ✅ Direito ao esquecimento (anonimização)

### Segurança
- ✅ Autenticação JWT
- ✅ Hash seguro de senhas (bcryptjs)
- ✅ Rate limiting por IP e endpoint
- ✅ Validação rigorosa de entrada
- ✅ Headers de segurança (Helmet)
- ✅ Logs de auditoria para todas as ações
- ✅ Bloqueio de conta após tentativas falhadas

## 👥 Tipos de Usuário

### 1. Admin
- Gerenciamento completo do sistema
- Acesso a relatórios e auditoria
- Criação de profissionais
- Estatísticas do sistema

### 2. Médico
- Gestão de consultas
- Acesso a dados de pacientes
- Prontuários médicos
- Prescrições

### 3. Enfermeiro
- Apoio ao atendimento
- Gestão de consultas
- Acesso limitado a dados

### 4. Paciente
- Visualização de próprios dados
- Histórico de consultas
- Agendamentos (com aprovação)

## 📊 Funcionalidades

### Autenticação (`/api/auth`)
- `POST /register` - Registro de usuário
- `POST /login` - Login
- `POST /logout` - Logout
- `GET /verify` - Verificar token
- `PUT /change-password` - Alterar senha
- `GET /profile` - Perfil do usuário
- `PUT /profile` - Atualizar perfil

### Pacientes (`/api/pacientes`)
- `POST /` - Criar paciente
- `GET /` - Listar pacientes
- `GET /:id` - Obter paciente específico
- `PUT /:id` - Atualizar paciente
- `DELETE /:id/deactivate` - Desativar paciente
- `POST /:id/anonymize` - Anonimizar dados (LGPD)
- `GET /statistics` - Estatísticas

### Profissionais (`/api/profissionais`)
- `POST /` - Criar profissional
- `GET /` - Listar profissionais
- `GET /:id` - Obter profissional específico
- `PUT /:id` - Atualizar profissional
- `DELETE /:id/deactivate` - Desativar profissional
- `GET /especialidade/:esp` - Listar por especialidade
- `GET /:id/agenda` - Ver agenda
- `GET /statistics` - Estatísticas

### Consultas (`/api/consultas`)
- `POST /` - Agendar consulta
- `GET /` - Listar consultas
- `GET /:id` - Obter consulta específica
- `PUT /:id` - Atualizar consulta
- `POST /:id/cancel` - Cancelar consulta
- `POST /:id/checkin` - Confirmar comparecimento
- `POST /:id/complete` - Concluir consulta
- `GET /report` - Relatórios

### Auditoria (`/api/audit`)
- `GET /` - Listar logs de auditoria
- `GET /:id` - Log específico
- `GET /statistics` - Estatísticas de auditoria
- `GET /user-activity` - Atividade por usuário
- `GET /security-report` - Relatório de segurança
- `GET /export` - Exportar logs

## 🚀 Instalação e Execução

### Pré-requisitos
- Node.js 16+ 
- npm ou yarn

### Instalação
```bash
# Clonar o repositório
git clone <repo-url>
cd sghss

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas configurações

# Executar migrações do banco
npm run migrate

# Iniciar em desenvolvimento
npm run dev

# Iniciar em produção
npm start
```

### Variáveis de Ambiente
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=sua_chave_jwt_muito_segura
JWT_EXPIRES_IN=1h
DB_NAME=sghss.db
ENCRYPTION_KEY=sua_chave_de_criptografia_32_chars
```

## 📝 Testes

```bash
# Executar todos os testes
npm test

# Executar testes com coverage
npm run test:coverage

# Executar testes em modo watch
npm run test:watch
```

## 📚 Documentação da API

### Autenticação
Todas as rotas protegidas requerem header:
```
Authorization: Bearer <jwt_token>
```

### Formato de Resposta Padrão
```json
{
  "success": true,
  "data": {},
  "message": "Operação realizada com sucesso",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Formato de Erro Padrão
```json
{
  "success": false,
  "error": "Código do erro",
  "message": "Descrição do erro",
  "details": {},
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔒 Rate Limiting

### Limites por Endpoint
- **Login**: 5 tentativas por 15 minutos
- **Geral**: 100 requests por 15 minutos
- **Admin**: 200 requests por 15 minutos

## 📋 Validações

### CPF
- Formato: XXX.XXX.XXX-XX
- Validação de dígitos verificadores

### Telefone
- Formato: (XX) XXXXX-XXXX

### CEP
- Formato: XXXXX-XXX

### Email
- Validação RFC compliant
- Normalização automática

### Senhas
- Mínimo 8 caracteres
- Pelo menos 1 letra minúscula
- Pelo menos 1 letra maiúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial

## 🔧 Configuração de Produção

### Banco de Dados
Para produção, configure PostgreSQL ou MySQL:

```javascript
// config/database.js
const config = {
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    }
  }
}
```

### SSL/HTTPS
Configure certificados SSL:
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem')
};

https.createServer(options, app).listen(443);
```

## 📊 Monitoramento

### Logs
- **Aplicação**: logs/app.log
- **Erro**: logs/error.log
- **Auditoria**: Banco de dados

### Métricas
- Tempo de resposta
- Taxa de erro
- Uso de memória
- Conexões ativas

## 🚨 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco**
   ```bash
   # Verificar se o arquivo de banco existe
   ls -la database/
   
   # Recriar banco
   npm run migrate:fresh
   ```

2. **Token JWT inválido**
   ```bash
   # Verificar variável JWT_SECRET
   echo $JWT_SECRET
   ```

3. **Rate limit atingido**
   - Aguardar 15 minutos
   - Verificar logs de IP suspeito

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato:
- Email: suporte@sghss.com
- Documentação: [docs.sghss.com](https://docs.sghss.com)

---

**SGHSS v1.0.0** - Sistema de Gestão Hospitalar e de Serviços de Saúde  
Desenvolvido com ❤️ para a área da saúde
