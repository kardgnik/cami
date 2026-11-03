# Funções compartilhadas pelos scripts de instalação, atualização e inicialização.
# Compatível com o Windows PowerShell 5.1 (já incluído no Windows 10/11).

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ArquivoEnv = Join-Path $Raiz '.env'
$Porta = 3000

function Titulo([string]$texto) {
    Write-Host ''
    Write-Host "==> $texto" -ForegroundColor Cyan
}

function Info([string]$texto) { Write-Host "    $texto" }
function Ok([string]$texto) { Write-Host "    [ok] $texto" -ForegroundColor Green }
function Aviso([string]$texto) { Write-Host "    [!] $texto" -ForegroundColor Yellow }

function Falhar([string]$texto) {
    Write-Host ''
    Write-Host "ERRO: $texto" -ForegroundColor Red
    throw $texto
}

function Perguntar([string]$texto, [string]$padrao = '') {
    $sufixo = ''
    if ($padrao) { $sufixo = " [$padrao]" }
    $r = Read-Host "    $texto$sufixo"
    if ([string]::IsNullOrWhiteSpace($r)) { return $padrao }
    return $r.Trim()
}

function Confirmar([string]$texto, [bool]$padraoSim = $true) {
    $opcoes = 's/N'
    if ($padraoSim) { $opcoes = 'S/n' }
    $r = Read-Host "    $texto ($opcoes)"
    if ([string]::IsNullOrWhiteSpace($r)) { return $padraoSim }
    return $r.Trim().ToLower().StartsWith('s')
}

function LerSenha([string]$texto) {
    $seguro = Read-Host "    $texto" -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

# Executa um programa externo e interrompe o script se ele falhar.
function Executar([string]$programa, [string[]]$argumentos) {
    Write-Host "    > $programa $($argumentos -join ' ')" -ForegroundColor DarkGray
    # Out-Host: a saída vai para a tela e não vira "valor de retorno" da função que chamou.
    & $programa @argumentos | Out-Host
    if ($LASTEXITCODE -ne 0) { Falhar "O comando '$programa $($argumentos -join ' ')' terminou com erro (código $LASTEXITCODE)." }
}

# Executa um programa externo sem mostrar a saída e devolve o código de saída.
# No PowerShell 5.1, redirecionar o stderr com $ErrorActionPreference = 'Stop'
# transforma qualquer aviso em erro fatal; por isso a preferência é relaxada aqui.
function Silencioso([string]$programa, [string[]]$argumentos) {
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { & $programa @argumentos *> $null; return $LASTEXITCODE }
    catch { return 1 }
    finally { $ErrorActionPreference = $anterior }
}

function Npm([string[]]$argumentos) { Executar 'npm.cmd' $argumentos }
function Npx([string[]]$argumentos) { Executar 'npx.cmd' $argumentos }

function ExisteComando([string]$nome) {
    return [bool](Get-Command $nome -ErrorAction SilentlyContinue)
}

# Recarrega o PATH do sistema (necessário logo após instalar algo com o winget).
function AtualizarPath {
    $maquina = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $usuario = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$maquina;$usuario"
}

function NovoSegredo([int]$bytes = 32) {
    $b = New-Object byte[] $bytes
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return [Convert]::ToBase64String($b)
}

# Senha só com letras e números, para não precisar escapar na URL do banco.
function NovaSenhaSimples([int]$tamanho = 24) {
    $letras = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $b = New-Object byte[] $tamanho
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
    return -join ($b | ForEach-Object { $letras[$_ % $letras.Length] })
}

# Lê o .env como dicionário (chave -> valor sem aspas).
function LerEnv {
    $valores = @{}
    if (-not (Test-Path $ArquivoEnv)) { return $valores }
    foreach ($linha in [IO.File]::ReadAllLines($ArquivoEnv)) {
        if ($linha -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $v = $Matches[2]
            if ($v.Length -ge 2 -and (($v.StartsWith('"') -and $v.EndsWith('"')) -or ($v.StartsWith("'") -and $v.EndsWith("'")))) {
                $v = $v.Substring(1, $v.Length - 2)
            }
            $valores[$Matches[1]] = $v
        }
    }
    return $valores
}

# Grava texto em UTF-8 sem BOM (o BOM atrapalha a leitura do .env).
function GravarTexto([string]$caminho, [string]$conteudo) {
    [IO.File]::WriteAllText($caminho, $conteudo, (New-Object Text.UTF8Encoding $false))
}

function VersaoNode {
    if (-not (ExisteComando 'node')) { return $null }
    $anterior = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try { $v = [string](& node -v 2>$null) } finally { $ErrorActionPreference = $anterior }
    if ($v -match '^v(\d+)\.(\d+)\.(\d+)') {
        return [Version]::new([int]$Matches[1], [int]$Matches[2], [int]$Matches[3])
    }
    return $null
}

function DockerDisponivel {
    if (-not (ExisteComando 'docker')) { return $false }
    return ((Silencioso 'docker' @('info')) -eq 0)
}

# Sobe o Postgres do docker-compose.yml e espera ele aceitar conexões.
function IniciarBancoDocker {
    if (-not (DockerDisponivel)) {
        Falhar 'O Docker não está rodando. Abra o Docker Desktop, espere ele iniciar e rode este script de novo.'
    }
    Push-Location $Raiz
    try {
        Executar 'docker' @('compose', 'up', '-d')
        Info 'Aguardando o banco de dados ficar pronto...'
        for ($i = 0; $i -lt 60; $i++) {
            if ((Silencioso 'docker' @('compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'cami', '-d', 'cami')) -eq 0) {
                Ok 'Banco de dados pronto.'
                return
            }
            Start-Sleep -Seconds 2
        }
        Falhar 'O banco de dados do Docker não respondeu a tempo.'
    }
    finally { Pop-Location }
}

# Procura um executável do PostgreSQL instalado no Windows (psql.exe, pg_dump.exe...).
function AcharPostgres([string]$exe) {
    $cmd = Get-Command $exe -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $bases = @($env:ProgramFiles, ${env:ProgramFiles(x86)}) | Where-Object { $_ }
    foreach ($base in $bases) {
        $pasta = Join-Path $base 'PostgreSQL'
        if (Test-Path $pasta) {
            $achado = Get-ChildItem -Path $pasta -Directory |
                Sort-Object { [int]($_.Name -replace '\D', '') } -Descending |
                ForEach-Object { Join-Path $_.FullName "bin\$exe" } |
                Where-Object { Test-Path $_ } |
                Select-Object -First 1
            if ($achado) { return $achado }
        }
    }
    return $null
}

# Remove parâmetros que só o Prisma entende (?schema=public) para usar a URL no psql/pg_dump.
function UrlParaLibpq([string]$url) {
    return ($url -split '\?')[0]
}

function ServidorRodando {
    try {
        $c = Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction Stop
        return [bool]$c
    }
    catch { return $false }
}

function EnderecosNaRede {
    try {
        return Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object {
                $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
                $_.PrefixOrigin -ne 'WellKnown' -and
                $_.InterfaceAlias -notmatch 'vEthernet|WSL|Loopback|VirtualBox|VMware|Docker'
            } |
            Select-Object -ExpandProperty IPAddress
    }
    catch { return @() }
}

# Ao terminar (com ou sem erro), espera uma tecla para a janela não fechar sozinha.
function Pausar {
    Write-Host ''
    Read-Host 'Pressione Enter para fechar' | Out-Null
}
