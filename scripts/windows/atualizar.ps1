# Atualiza o sistema para a versão mais recente do repositório:
# backup do banco -> git pull -> dependências -> migrações -> seed -> build.

. (Join-Path $PSScriptRoot 'comum.ps1')

function FazerBackup($cfg) {
    $pasta = Join-Path $Raiz 'backups'
    if (-not (Test-Path $pasta)) { New-Item -ItemType Directory -Path $pasta | Out-Null }
    $arquivo = Join-Path $pasta ("cami-{0}.sql" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

    if ($cfg['BANCO_MODO'] -eq 'docker') {
        Executar 'docker' @('compose', 'exec', '-T', 'db', 'pg_dump', '-U', 'cami', '-d', 'cami', '--no-owner', '-f', '/tmp/backup.sql')
        Executar 'docker' @('compose', 'cp', 'db:/tmp/backup.sql', $arquivo)
    }
    else {
        $pgDump = AcharPostgres 'pg_dump.exe'
        if (-not $pgDump) { Falhar 'pg_dump.exe não encontrado.' }
        Executar $pgDump @('--dbname', (UrlParaLibpq $cfg['DATABASE_URL']), '--no-owner', '-f', $arquivo)
    }
    if (-not (Test-Path $arquivo) -or (Get-Item $arquivo).Length -eq 0) { Falhar 'O arquivo de backup ficou vazio.' }
    Ok "Backup salvo em $arquivo"

    # mantém só os 10 backups mais recentes
    Get-ChildItem -Path $pasta -Filter 'cami-*.sql' | Sort-Object Name -Descending | Select-Object -Skip 10 | Remove-Item -Force
}

try {
    Set-Location $Raiz
    Write-Host ''
    Write-Host '  Gestão de Mesas — atualização' -ForegroundColor White
    Write-Host "  Pasta: $Raiz" -ForegroundColor DarkGray

    if (-not (Test-Path $ArquivoEnv)) { Falhar 'O sistema ainda não foi instalado nesta pasta. Rode o instalar.bat primeiro.' }
    if (-not (ExisteComando 'git')) { Falhar 'O Git não foi encontrado. Instale em https://git-scm.com e rode de novo.' }
    if (-not (ExisteComando 'node')) { Falhar 'O Node.js não foi encontrado. Rode o instalar.bat.' }

    Titulo 'Verificando se o sistema está aberto'
    if (ServidorRodando) {
        Aviso "O sistema está rodando (porta $Porta). Feche a janela do iniciar.bat antes de atualizar."
        if (-not (Confirmar 'Já fechei. Continuar?' $false)) { return }
        if (ServidorRodando) { Falhar "A porta $Porta continua em uso. Feche o sistema e rode o atualizar.bat de novo." }
    }
    Ok 'Sistema fechado.'

    Titulo 'Verificando alterações locais'
    $alterados = & git status --porcelain --untracked-files=no
    if ($LASTEXITCODE -ne 0) { Falhar 'Esta pasta não parece ser um clone do repositório (git status falhou).' }
    if ($alterados) {
        Write-Host ($alterados | Out-String) -ForegroundColor Yellow
        Falhar 'Há arquivos do sistema modificados nesta pasta. Para descartar essas mudanças e atualizar, rode: git checkout -- .  (o .env e os backups não são afetados)'
    }
    Ok 'Nenhuma alteração local.'

    $cfg = LerEnv
    if ($cfg['BANCO_MODO'] -eq 'docker') {
        Titulo 'Banco de dados (Docker)'
        IniciarBancoDocker
    }

    Titulo 'Baixando a versão mais recente'
    $antes = (& git rev-parse HEAD).Trim()
    Executar 'git' @('pull', '--ff-only')
    $depois = (& git rev-parse HEAD).Trim()
    if ($antes -eq $depois) {
        Ok 'Você já está na versão mais recente.'
        if (-not (Confirmar 'Reinstalar dependências e gerar o build mesmo assim?' $false)) { return }
    }
    else {
        Ok 'Novidades desta atualização:'
        & git log --oneline "$antes..$depois" | Out-Host
    }

    Titulo 'Backup do banco de dados'
    try { FazerBackup $cfg }
    catch {
        Aviso "Não foi possível fazer o backup: $($_.Exception.Message)"
        if (-not (Confirmar 'Continuar a atualização sem backup?' $false)) { return }
    }

    Titulo 'Atualizando dependências'
    Npm @('ci', '--no-audit', '--no-fund')

    Titulo 'Atualizando as tabelas do banco'
    Npm @('run', 'db:deploy')

    Titulo 'Atualizando o login do gerente e os cadastros iniciais'
    Npm @('run', 'db:seed')

    Titulo 'Gerando a versão otimizada do sistema'
    Npm @('run', 'build')

    Write-Host ''
    Write-Host '  Atualização concluída!' -ForegroundColor Green
    if (Confirmar 'Iniciar o sistema agora?') {
        & (Join-Path $PSScriptRoot 'iniciar.ps1') -SemPausa
    }
}
catch {
    Write-Host ''
    Write-Host 'A atualização não foi concluída.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host 'Os dados não foram apagados. Se o problema continuar, envie esta mensagem para o desenvolvedor.' -ForegroundColor Yellow
}
finally {
    Pausar
}
