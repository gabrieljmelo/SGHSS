# Script de Teste Automatizado para SGHSS API
# Execute com: .\test-api.ps1

$baseUrl = "http://localhost:3000"
$timestamp = Get-Date -Format "HHmmss"

Write-Host "=== SGHSS - TESTE AUTOMATIZADO ===" -ForegroundColor Green
Write-Host ""

# Função para fazer requisições com tratamento de erro
function Invoke-ApiRequest {
    param($Uri, $Method = "GET", $Body = $null, $Headers = @{})
    
    try {
        if ($Body) {
            $Headers["Content-Type"] = "application/json"
            return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $Body
        } else {
            return Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers
        }
    } catch {
        Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# 1. Verificar se servidor está rodando
Write-Host "1. Testando conexão com servidor..." -ForegroundColor Yellow
$health = Invoke-ApiRequest -Uri "$baseUrl/health"
if ($health) {
    Write-Host "✅ Servidor funcionando: $($health.service) v$($health.version)" -ForegroundColor Green
} else {
    Write-Host "❌ Servidor não está rodando! Execute 'npm start' primeiro." -ForegroundColor Red
    exit 1
}

# 2. Login como admin
Write-Host "`n2. Fazendo login como admin..." -ForegroundColor Yellow
$adminLogin = Invoke-ApiRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body '{"email":"admin@teste.com","senha":"123456"}'
if ($adminLogin) {
    $adminToken = $adminLogin.token
    Write-Host "✅ Admin logado com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Falha no login do admin" -ForegroundColor Red
    exit 1
}

# 3. Criar usuário enfermeiro
Write-Host "`n3. Criando usuário enfermeiro..." -ForegroundColor Yellow
$enfermeiroData = @{
    nome = "Ana Silva"
    email = "ana.enfermeiro$timestamp@hospital.com"
    senha = "123456"
    tipo = "enfermeiro"
} | ConvertTo-Json

$novoEnfermeiro = Invoke-ApiRequest -Uri "$baseUrl/api/auth/register" -Method POST -Body $enfermeiroData
if ($novoEnfermeiro) {
    Write-Host "✅ Enfermeiro criado: $($novoEnfermeiro.usuario.email)" -ForegroundColor Green
    
    # Login do enfermeiro
    $enfermeiroLogin = Invoke-ApiRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body (@{email=$novoEnfermeiro.usuario.email; senha="123456"} | ConvertTo-Json)
    $enfermeiroToken = $enfermeiroLogin.token
} else {
    Write-Host "❌ Falha ao criar enfermeiro" -ForegroundColor Red
}

# 4. Criar pacientes
Write-Host "`n4. Criando pacientes..." -ForegroundColor Yellow
$pacientes = @(
    @{
        nome = "João Silva $timestamp"
        email = "joao$timestamp@paciente.com"
        telefone = "(11) 99999-9999"
        data_nascimento = "1990-05-15"
        cpf = "123.456.789-01"
        endereco = "Rua das Flores, 123"
        cidade = "São Paulo"
        estado = "SP"
        cep = "01234-567"
        convenio = "SUS"
        senha = "paciente123"
    },
    @{
        nome = "Maria Santos $timestamp"
        email = "maria$timestamp@paciente.com"
        telefone = "(11) 88888-8888"
        data_nascimento = "1985-03-20"
        cpf = "987.654.321-00"
        endereco = "Av. Paulista, 456"
        cidade = "São Paulo"
        estado = "SP"
        cep = "01310-000"
        convenio = "Particular"
        senha = "paciente456"
    }
)

foreach ($pacienteData in $pacientes) {
    $pacienteJson = $pacienteData | ConvertTo-Json
    $novoPaciente = Invoke-ApiRequest -Uri "$baseUrl/api/pacientes" -Method POST -Headers @{"Authorization"="Bearer $enfermeiroToken"} -Body $pacienteJson
    if ($novoPaciente) {
        Write-Host "✅ Paciente criado: $($pacienteData.nome)" -ForegroundColor Green
    } else {
        Write-Host "❌ Falha ao criar paciente: $($pacienteData.nome)" -ForegroundColor Red
    }
}

# 5. Listar pacientes
Write-Host "`n5. Listando pacientes..." -ForegroundColor Yellow
$pacientes = Invoke-ApiRequest -Uri "$baseUrl/api/pacientes" -Headers @{"Authorization"="Bearer $enfermeiroToken"}
if ($pacientes) {
    Write-Host "✅ Total de pacientes: $($pacientes.pagination.total)" -ForegroundColor Green
    foreach ($p in $pacientes.pacientes) {
        Write-Host "   - $($p.nome) ($($p.usuario.email))" -ForegroundColor Cyan
    }
}

# 6. Testar informações da API
Write-Host "`n6. Informações da API..." -ForegroundColor Yellow
$apiInfo = Invoke-ApiRequest -Uri "$baseUrl/api/info"
if ($apiInfo) {
    Write-Host "✅ Versão: $($apiInfo.version)" -ForegroundColor Green
    Write-Host "   Features: $($apiInfo.features -join ', ')" -ForegroundColor Cyan
}

Write-Host "`n=== TESTE CONCLUÍDO ===" -ForegroundColor Green
Write-Host "Use os seguintes endpoints para testes manuais:" -ForegroundColor Yellow
Write-Host "- Health: GET $baseUrl/health" -ForegroundColor Cyan
Write-Host "- API Info: GET $baseUrl/api/info" -ForegroundColor Cyan
Write-Host "- Login: POST $baseUrl/api/auth/login" -ForegroundColor Cyan
Write-Host "- Pacientes: GET/POST $baseUrl/api/pacientes" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tokens salvos em variáveis:" -ForegroundColor Yellow
Write-Host "`$adminToken = '$($adminToken.Substring(0,20))...'" -ForegroundColor Cyan
Write-Host "`$enfermeiroToken = '$($enfermeiroToken.Substring(0,20))...'" -ForegroundColor Cyan

# Disponibilizar tokens globalmente
$global:adminToken = $adminToken
$global:enfermeiroToken = $enfermeiroToken
