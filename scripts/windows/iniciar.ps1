# Inicia o sistema (e o banco no Docker, se for o caso) e abre o navegador.
# Para parar, feche a janela.

param([switch]$SemPausa)

. (Join-Path $PSScriptRoot 'comum.ps1')

try {
    Set-Location $Raiz
    if (-not (Test-Path $ArquivoEnv)) { Falhar 'O sistema ainda não foi instalado nesta pasta. Rode o instalar.bat primeiro.' }

    $url = "http://localhost:$Porta"
    if (ServidorRodando) {
        Ok "O sistema já está rodando. Abrindo $url"
        Start-Process $url
        return
    }

    $cfg = LerEnv
    if ($cfg['BANCO_MODO'] -eq 'docker') {
        Titulo 'Banco de dados (Docker)'
        IniciarBancoDocker
    }

    if (-not (Test-Path (Join-Path $Raiz '.next\BUILD_ID'))) {
        Titulo 'Gerando a versão otimizada do sistema (primeira vez)'
        Npm @('run', 'build')
    }

    Titulo 'Iniciando o sistema'
    Info "Neste computador: $url"
    foreach ($ip in EnderecosNaRede) { Info "Na rede local:    http://${ip}:$Porta" }
    Info 'Na primeira vez, o Windows pode pedir permissão do Firewall: permita em "Redes privadas" para os mestres acessarem pelo celular.'
    Write-Host ''
    Write-Host '    Para PARAR o sistema, feche esta janela.' -ForegroundColor Yellow
    Write-Host ''

    # abre o navegador alguns segundos depois, quando o servidor já respondeu
    Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "timeout /t 5 /nobreak >nul & start `"`" $url" -WindowStyle Hidden

    & npm.cmd run start -- -p $Porta
}
catch {
    Write-Host ''
    Write-Host 'Não foi possível iniciar o sistema.' -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    if (-not $SemPausa) { Pausar }
}
