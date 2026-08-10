[CmdletBinding()]
param(
    [string]$ProjectId = "rina-crm",
    [string]$InstanceName = "ohwao-erp",
    [string]$Zone = "southamerica-east1-c",
    [string]$RemoteRepo = "/home/meatychip_coolbaby_gmail_com/gema",
    [string]$Pm2App = "gema"
)

$ErrorActionPreference = "Stop"

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [Parameter(Mandatory = $true)]
        [string]$FailureMessage
    )

    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$FailureMessage (exit code $LASTEXITCODE)."
    }
}

Write-Host "Configurando gcloud para el proyecto $ProjectId..."
Invoke-CheckedCommand {
    gcloud config set project $ProjectId
} "No se pudo seleccionar el proyecto de Google Cloud"

$remoteCommand = @(
    "set -e"
    "cd '$RemoteRepo'"
    "git pull --ff-only"
    "npm run build"
    "pm2 restart '$Pm2App'"
    "pm2 ls"
) -join "; "

Write-Host "Actualizando, compilando y reiniciando $Pm2App en $InstanceName..."
Invoke-CheckedCommand {
    gcloud compute ssh $InstanceName `
        --project=$ProjectId `
        --zone=$Zone `
        --command=$remoteCommand
} "El despliegue remoto de $Pm2App falló"

Write-Host "Despliegue de $Pm2App completado correctamente."
