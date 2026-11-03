# Instala o sistema neste computador: Node.js, banco de dados, configuração,
# dependências, tabelas, login do gerente e build. Pode ser rodado de novo
# com segurança (mantém o .env e os dados existentes).

. (Join-Path $PSScriptRoot 'comum.ps1')

function InstalarNode {
    Titulo 'Node.js'
    $minimo = [Version]'20.9.0'
    $v = VersaoNode
    if ($v -and $v -ge $minimo) { Ok "Node.js $v encontrado."; return }

    if ($v) { Aviso "Node.js $v é antigo; o sistema precisa da versão $minimo ou mais nova." }
    else { Aviso 'Node.js não encontrado.' }

    if (-not (ExisteComando 'winget')) {
        Falhar 'Instale o Node.js LTS pelo site https://nodejs.org e rode o instalar.bat de novo.'
    }
    if (-not (Confirmar 'Instalar o Node.js LTS agora (via winget)?')) {
        Falhar 'O Node.js é necessário. Instale pelo site https://nodejs.org e rode o instalar.bat de novo.'
    }
    $acao = 'install'
    if ($v) { $acao = 'upgrade' }
    # O código de saída do winget não é conferido: ele também "falha" quando não há nada a atualizar.
    # O que vale é a versão do Node depois.
    & winget $acao -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements | Out-Host
    AtualizarPath
    $v = VersaoNode
    if (-not $v -or $v -lt $minimo) {
        Falhar 'O Node.js foi instalado, mas esta janela ainda não o enxerga. Feche-a e rode o instalar.bat de novo.'
    }
    Ok "Node.js $v instalado."
}

# Cria (ou atualiza a senha do) usuário "cami" e o banco "cami" num PostgreSQL local.
function CriarBancoLocal([string]$psql, [string]$servidor, [string]$porta, [string]$superusuario, [string]$senhaSuper) {
    $senhaApp = NovaSenhaSimples
    $env:PGPASSWORD = $senhaSuper
    try {
        $base = @('-h', $servidor, '-p', $porta, '-U', $superusuario, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA')

        Info 'Conectando ao PostgreSQL...'
        $conectou = $false
        for ($i = 0; $i -lt 30; $i++) {
            if ((Silencioso $psql ($base + @('-c', 'SELECT 1'))) -eq 0) { $conectou = $true; break }
            Start-Sleep -Seconds 2
        }
        if (-not $conectou) { Falhar "Não consegui conectar ao PostgreSQL em ${servidor}:$porta com o usuário '$superusuario'. Confira a senha e se o serviço do PostgreSQL está rodando." }

        $existeUsuario = [string](& $psql @base -c "SELECT 1 FROM pg_roles WHERE rolname = 'cami'")
        if ($existeUsuario.Trim() -eq '1') {
            Executar $psql ($base + @('-c', "ALTER ROLE cami WITH LOGIN CREATEDB PASSWORD '$senhaApp'"))
        }
        else {
            Executar $psql ($base + @('-c', "CREATE ROLE cami WITH LOGIN CREATEDB PASSWORD '$senhaApp'"))
        }
        $existeBanco = [string](& $psql @base -c "SELECT 1 FROM pg_database WHERE datname = 'cami'")
        if ($existeBanco.Trim() -ne '1') {
            Executar $psql ($base + @('-c', 'CREATE DATABASE cami OWNER cami'))
        }
        Ok "Banco 'cami' pronto em ${servidor}:$porta."
    }
    finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
    return "postgresql://cami:$senhaApp@${servidor}:$porta/cami?schema=public"
}

function InstalarPostgresWinget {
    if (-not (ExisteComando 'winget')) {
        Falhar 'O winget não está disponível. Instale o PostgreSQL pelo site https://www.postgresql.org/download/windows/ e escolha a opção 2.'
    }
    $senhaSuper = NovaSenhaSimples
    Info 'Instalando o PostgreSQL 16 (pode levar alguns minutos)...'
    $override = "--mode unattended --unattendedmodeui none --superpassword $senhaSuper --serverport 5432"
    & winget install -e --id PostgreSQL.PostgreSQL.16 --accept-source-agreements --accept-package-agreements --override $override | Out-Host
    AtualizarPath
    $psql = AcharPostgres 'psql.exe'
    if (-not $psql) {
        Falhar 'O PostgreSQL não foi encontrado após a instalação. Instale pelo site https://www.postgresql.org/download/windows/ e rode o instalar.bat de novo escolhendo a opção 2.'
    }
    return @{ Psql = $psql; SenhaSuper = $senhaSuper }
}

function ConfigurarBanco {
    Titulo 'Banco de dados'
    $temDocker = DockerDisponivel
    $psql = AcharPostgres 'psql.exe'

    Info 'Onde o banco de dados (PostgreSQL) vai rodar?'
    $d = 'não detectado'; if ($temDocker) { $d = 'detectado' }
    $p = 'não detectado'; if ($psql) { $p = 'detectado' }
    Info "  1) Docker Desktop ($d)"
    Info "  2) PostgreSQL já instalado neste computador ($p)"
    Info '  3) Instalar o PostgreSQL agora (via winget)'
    $padrao = '3'
    if ($psql) { $padrao = '2' }
    if ($temDocker) { $padrao = '1' }
    $opcao = Perguntar 'Opção' $padrao

    switch ($opcao) {
        '1' {
            if (-not $temDocker) { Falhar 'O Docker não está rodando. Abra o Docker Desktop, espere ele iniciar e rode o instalar.bat de novo.' }
            IniciarBancoDocker
            return @{ Modo = 'docker'; Url = 'postgresql://cami:cami@localhost:5432/cami?schema=public'; Extra = '' }
        }
        '2' {
            if (-not $psql) { Falhar 'Não encontrei o psql.exe do PostgreSQL. Confira a instalação ou escolha outra opção.' }
            Ok "psql encontrado: $psql"
            $servidor = Perguntar 'Servidor' 'localhost'
            $porta = Perguntar 'Porta' '5432'
            $super = Perguntar 'Usuário administrador do PostgreSQL' 'postgres'
            $senha = LerSenha "Senha do usuário '$super' (definida na instalação do PostgreSQL)"
            $url = CriarBancoLocal $psql $servidor $porta $super $senha
            return @{ Modo = 'local'; Url = $url; Extra = '' }
        }
        '3' {
            $r = InstalarPostgresWinget
            $url = CriarBancoLocal $r.Psql 'localhost' '5432' 'postgres' $r.SenhaSuper
            $extra = "# Senha do usuário 'postgres' criada na instalação do PostgreSQL. Guarde-a.`r`nPOSTGRES_SENHA_ADMIN=`"$($r.SenhaSuper)`"`r`n"
            return @{ Modo = 'local'; Url = $url; Extra = $extra }
        }
        default { Falhar "Opção inválida: $opcao" }
    }
}

function PedirGerente {
    Titulo 'Login do gerente'
    $regra = '^[a-z0-9._-]{3,40}$'
    do {
        $usuario = (Perguntar 'Usuário do gerente (para entrar no painel)' 'admin').ToLower()
        if ($usuario -cnotmatch $regra) { Aviso 'Use de 3 a 40 letras minúsculas, números, ponto, hífen ou sublinhado (sem espaços nem acentos).' }
    } while ($usuario -cnotmatch $regra)

    while ($true) {
        $senha = LerSenha 'Senha do gerente (mínimo 8 caracteres)'
        if ($senha.Length -lt 8) { Aviso 'A senha precisa ter ao menos 8 caracteres.'; continue }
        if ($senha.Contains("'")) { Aviso 'Não use aspas simples ('') na senha.'; continue }
        $confirmacao = LerSenha 'Repita a senha'
        if ($senha -ne $confirmacao) { Aviso 'As senhas não conferem.'; continue }
        break
    }
    return @{ Usuario = $usuario; Senha = $senha }
}

function CriarEnv {
    $banco = ConfigurarBanco
    $gerente = PedirGerente
    $data = Get-Date -Format 'yyyy-MM-dd HH:mm'
    $conteudo = @"
# Configuração gerada pelo instalar.bat em $data.
# Este arquivo contém senhas: não compartilhe nem envie para o Git.

# "docker" (Postgres do docker-compose.yml) ou "local" (PostgreSQL instalado no Windows)
BANCO_MODO="$($banco.Modo)"
DATABASE_URL="$($banco.Url)"

# Segredo que assina o login. Trocar desconecta todo mundo.
SESSION_SECRET="$(NovoSegredo)"

# Login do gerente. Para trocar a senha, altere aqui e rode o atualizar.bat (ou: npm run db:seed).
ADMIN_USUARIO="$($gerente.Usuario)"
ADMIN_PASSWORD='$($gerente.Senha)'

# Instalação local: permite entrar por http:// a partir de outros aparelhos da rede (ex.: celular dos mestres).
COOKIE_SECURE="false"

$($banco.Extra)
"@
    GravarTexto $ArquivoEnv ($conteudo -replace "`r?`n", "`r`n")
    Ok 'Arquivo .env criado.'
}

try {
    Set-Location $Raiz
    Write-Host ''
    Write-Host '  Gestão de Mesas — instalação' -ForegroundColor White
    Write-Host "  Pasta: $Raiz" -ForegroundColor DarkGray

    InstalarNode

    Titulo 'Configuração'
    if (Test-Path $ArquivoEnv) {
        Ok 'O arquivo .env já existe: mantendo a configuração e os dados atuais.'
        $cfg = LerEnv
        if ($cfg['BANCO_MODO'] -eq 'docker') { IniciarBancoDocker }
    }
    else {
        CriarEnv
    }

    Titulo 'Instalando dependências (pode levar alguns minutos)'
    Npm @('ci', '--no-audit', '--no-fund')

    Titulo 'Criando as tabelas do banco'
    Npm @('run', 'db:deploy')

    Titulo 'Criando o login do gerente e os cadastros iniciais'
    Npm @('run', 'db:seed')

    Titulo 'Gerando a versão otimizada do sistema'
    Npm @('run', 'build')

    $cfg = LerEnv
    Write-Host ''
    Write-Host '  Instalação concluída!' -ForegroundColor Green
    Write-Host ''
    Info 'Para abrir o sistema, use o iniciar.bat (nesta mesma pasta).'
    Info "Endereço neste computador: http://localhost:$Porta"
    foreach ($ip in EnderecosNaRede) { Info "Na rede local (celular dos mestres): http://${ip}:$Porta" }
    $usuarioGerente = $cfg['ADMIN_USUARIO']
    if (-not $usuarioGerente) { $usuarioGerente = ($cfg['ADMIN_EMAIL'] -split '@')[0] }
    Info "Login do gerente: usuário '$usuarioGerente'"
    Info 'Para atualizar no futuro, use o atualizar.bat.'

    if (Confirmar 'Iniciar o sistema agora?') {
        & (Join-Path $PSScriptRoot 'iniciar.ps1') -SemPausa
    }
}
catch {
    Write-Host ''
    Write-Host 'A instalação não foi concluída.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    Pausar
}
