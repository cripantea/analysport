@servers(['production' => 'cristi@srv961648'])

@setup
    $appPath     = '/home/cristi/project-alfa';
    $venvPath    = $appPath . '/venv';
    $frontPath   = $appPath . '/frontend';
    $repo        = 'https://github.com/cripantea/analysport.git';
    $service     = 'analysport-api';
@endsetup

{{-- ============================================================
     deploy — aggiorna un'installazione esistente
     Uso: envoy run deploy
     ============================================================ --}}
@task('deploy', ['on' => 'production'])
    echo "=== Deploy: $(date) ==="

    cd {{ $appPath }}
    git pull origin main

    echo "--- Dipendenze Python ---"
    source {{ $venvPath }}/bin/activate
    pip install -r requirements.txt --quiet

    echo "--- Build frontend ---"
    cd {{ $frontPath }}
    npm ci --silent
    VITE_API_URL="" npm run build

    echo "--- Riavvio servizio ---"
    sudo systemctl restart {{ $service }}
    sudo systemctl status  {{ $service }} --no-pager -l

    echo "=== Deploy completato: $(date) ==="
@endtask

{{-- ============================================================
     setup — primo deploy su un server pulito
     Uso: envoy run setup
     Prerequisito: copia .env in {{ $appPath }}/.env prima di avviare il servizio
     ============================================================ --}}
@task('setup', ['on' => 'production'])
    echo "=== Setup iniziale: $(date) ==="

    if [ ! -d {{ $appPath }} ]; then
        git clone {{ $repo }} {{ $appPath }}
    else
        echo "Cartella già presente, salto il clone."
        cd {{ $appPath }} && git pull origin main
    fi

    cd {{ $appPath }}

    echo "--- Cartelle dati ---"
    mkdir -p data/raw data/analyzed

    echo "--- Virtual environment Python ---"
    python3 -m venv {{ $venvPath }}
    source {{ $venvPath }}/bin/activate
    pip install -r requirements.txt

    echo "--- Build frontend ---"
    cd {{ $frontPath }}
    npm ci
    VITE_API_URL="" npm run build

    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  Passi manuali prima di avviare il servizio:            ║"
    echo "║  1. Copia .env in {{ $appPath }}/.env      ║"
    echo "║  2. sudo systemctl enable {{ $service }}                 ║"
    echo "║  3. sudo systemctl start  {{ $service }}                 ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "=== Setup completato: $(date) ==="
@endtask
