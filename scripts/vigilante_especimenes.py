#!/usr/bin/env python3
"""
vigilante_especimenes.py — Guardián autónomo de Hot Folder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CÓMO FUNCIONA (cero intervención manual):
  1. Copia o mueve tus fotos a ./hot_folder/
  2. El vigilante las detecta AL INSTANTE con watchdog
  3. Llama a procesar_activo() → processor.py
  4. processor.py sube a Cloudinary con Adobe Sensei Remove Background
  5. Registra en Supabase → aparece en Admin Overview listo para venta

CONVENCIÓN DE NOMBRE:
  {CODE}[_{vista}].{ext}
  BR-001_dorsal.jpg   →  espécimen BR-001, vista dorsal
  BR-001_ventral.png  →  espécimen BR-001, vista ventral
  MO-015.glb          →  modelo 3D de MO-015
  HE-032.mp4          →  video de HE-032

USO:
  # Activar entorno primero (una vez por sesión):
  source scripts/.venv/bin/activate

  # Vigilante en tiempo real (hot_folder/ por defecto):
  python scripts/vigilante_especimenes.py

  # Carpeta personalizada:
  python scripts/vigilante_especimenes.py --folder ~/Desktop/fotos

  # Procesar lo que ya hay en la carpeta y luego vigilar:
  python scripts/vigilante_especimenes.py --procesar-existentes

  # Probar sin subir nada:
  python scripts/vigilante_especimenes.py --dry-run
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
from __future__ import annotations

import argparse
import json
import logging
import queue
import shutil
import sys
import threading
import time
from pathlib import Path

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("vigilante")

# ── Importar motor de procesamiento desde processor.py ───────────────────────
ROOT = Path(__file__).resolve().parent.parent
SCRIPTS_DIR = Path(__file__).resolve().parent

sys.path.insert(0, str(SCRIPTS_DIR))   # permite: from processor import ...

try:
    from processor import procesar_activo
    log.info("✔ Motor processor.py cargado correctamente")
except ImportError as e:
    sys.exit(
        f"No se pudo importar processor.py: {e}\n\n"
        "Asegúrate de tener el entorno activo:\n"
        "  source scripts/.venv/bin/activate\n"
        "Y las dependencias instaladas:\n"
        "  pip install cloudinary supabase python-dotenv watchdog pillow requests"
    )

# ── watchdog ──────────────────────────────────────────────────────────────────
try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    sys.exit(
        "Falta watchdog.\n"
        "Ejecuta: pip install watchdog"
    )

# ── Config ────────────────────────────────────────────────────────────────────
DEFAULT_HOT_FOLDER     = ROOT / "hot_folder"
DEFAULT_PROCESADOS     = ROOT / "procesados_finales"
CHECKPOINT_FILE        = ROOT / ".vigilante_checkpoint.json"
DEBOUNCE_S             = 2.0    # espera para que el archivo termine de copiarse
RETRY_MAX              = 3      # reintentos ante fallo
RETRY_DELAY_S          = 10.0   # pausa entre reintentos

SUPPORTED_EXT = {
    ".jpg", ".jpeg", ".png", ".webp", ".tiff",   # fotos
    ".glb", ".gltf",                              # modelos 3D
    ".mp4", ".mov",                               # videos
}

# ── Checkpoint ────────────────────────────────────────────────────────────────

def _load_checkpoint() -> set[str]:
    if CHECKPOINT_FILE.exists():
        try:
            return set(json.loads(CHECKPOINT_FILE.read_text("utf-8")))
        except Exception:
            pass
    return set()


def _save_checkpoint(done: set[str]) -> None:
    CHECKPOINT_FILE.write_text(
        json.dumps(sorted(done), indent=2), encoding="utf-8"
    )


# ── Limpieza: organizar en procesados_finales/{PREFIJO}/ ──────────────────────

def _prefijo_desde_nombre(nombre_archivo: str) -> str:
    """
    Prefijo dinámico para subcarpeta:
      MARIPOSA_001.jpg  →  MARIPOSA
      BR-001_dorsal.jpg →  BR-001
      foto.jpg          →  OTROS   (sin '_')
    """
    if "_" in nombre_archivo:
        prefijo = nombre_archivo.split("_", 1)[0].strip()
        return prefijo if prefijo else "OTROS"
    return "OTROS"


def _mover_a_procesados(path: Path, dest_dir: Path) -> Path | None:
    """
    Tras éxito:
      hot_folder/MARIPOSA_001.jpg
        → procesados_finales/MARIPOSA/MARIPOSA_001.jpg
    shutil.move elimina el archivo de hot_folder (queda vacía y lista).
    Crea procesados_finales/ y la subcarpeta automáticamente si no existen.
    """
    try:
        prefijo = _prefijo_desde_nombre(path.name)
        carpeta_sub = dest_dir / prefijo
        carpeta_sub.mkdir(parents=True, exist_ok=True)

        destino = carpeta_sub / path.name
        if destino.exists():
            stem, suffix = path.stem, path.suffix
            n = 1
            while True:
                candidato = carpeta_sub / f"{stem}_{n}{suffix}"
                if not candidato.exists():
                    destino = candidato
                    break
                n += 1

        shutil.move(str(path), str(destino))
        # Confirmación pedida: ARCHIVO ORGANIZADO EN...
        log.info("[✓] ARCHIVO ORGANIZADO EN: %s", destino)
        return destino
    except Exception as exc:
        log.warning("  ⚠ No se pudo organizar %s → procesados_finales: %s", path.name, exc)
        return None

# ── Contadores ────────────────────────────────────────────────────────────────

class _Counters:
    def __init__(self) -> None:
        self._lock     = threading.Lock()
        self.detected  = 0
        self.ok        = 0
        self.errores   = 0
        self.ignorados = 0

    def inc(self, field: str) -> None:
        with self._lock:
            setattr(self, field, getattr(self, field) + 1)

    def resumen(self) -> str:
        return (
            f"  Detectados: {self.detected} | "
            f"✔ OK: {self.ok} | "
            f"✘ Errores: {self.errores} | "
            f"— Ignorados: {self.ignorados}"
        )

counters = _Counters()

# ── Cola de trabajo (thread-safe) ─────────────────────────────────────────────

class _Item:
    __slots__ = ("path", "added_at", "retries")
    def __init__(self, path: Path, added_at: float, retries: int = 0):
        self.path     = path
        self.added_at = added_at
        self.retries  = retries

_queue: queue.Queue[_Item] = queue.Queue()

# ── Worker thread ─────────────────────────────────────────────────────────────

def _worker(checkpoint: set[str], dry_run: bool, dest_dir: Path) -> None:
    """Consume la cola y llama a procesar_activo() por cada archivo."""
    while True:
        try:
            item = _queue.get(timeout=0.5)
        except queue.Empty:
            continue

        # Debounce: esperar a que la copia termine
        wait = DEBOUNCE_S - (time.monotonic() - item.added_at)
        if wait > 0:
            time.sleep(wait)

        path = item.path
        key  = str(path)

        # Verificaciones rápidas
        if not path.exists():
            log.warning("Archivo desaparecido antes de procesar: %s", path.name)
            counters.inc("ignorados")
            _queue.task_done()
            continue

        if key in checkpoint:
            log.debug("Ya procesado (checkpoint): %s", path.name)
            counters.inc("ignorados")
            _queue.task_done()
            continue

        log.info("▶ [%d en cola] Procesando: %s", _queue.qsize(), path.name)

        # ── Llamar al motor ───────────────────────────────────────────────────
        if dry_run:
            prefijo = _prefijo_desde_nombre(path.name)
            log.info(
                "  [DRY-RUN] Se omitiría: %s → %s/%s/",
                path.name, dest_dir.name, prefijo,
            )
            counters.inc("ok")
            _queue.task_done()
            continue

        try:
            ok = procesar_activo(path)          # ← importado de processor.py
        except Exception as exc:
            log.exception("  Excepción inesperada en procesar_activo: %s", exc)
            ok = False

        if ok:
            counters.inc("ok")
            checkpoint.add(key)
            _save_checkpoint(checkpoint)
            # Organiza por prefijo y limpia hot_folder (shutil.move)
            _mover_a_procesados(path, dest_dir)
            log.info("[✓] PROCESAMIENTO EXITOSO: %s", path.name)
        else:
            if item.retries < RETRY_MAX:
                log.warning(
                    "  ✘ Falló: %s — reintento %d/%d en %ds",
                    path.name, item.retries + 1, RETRY_MAX, RETRY_DELAY_S,
                )
                time.sleep(RETRY_DELAY_S)
                _queue.put(_Item(path, time.monotonic(), item.retries + 1))
            else:
                counters.inc("errores")
                log.error(
                    "  ✘ Abandonado tras %d intentos: %s",
                    RETRY_MAX, path.name,
                )

        _queue.task_done()

# ── Watchdog handler ──────────────────────────────────────────────────────────

class _HotFolderHandler(FileSystemEventHandler):
    """Detecta archivos nuevos (creados O movidos a la carpeta)."""

    def __init__(self, checkpoint: set[str]) -> None:
        super().__init__()
        self._checkpoint = checkpoint

    def _enqueue(self, path: Path) -> None:
        if path.suffix.lower() not in SUPPORTED_EXT:
            return
        if str(path) in self._checkpoint:
            return
        counters.inc("detected")
        log.info("⚡ Detectado: %s", path.name)
        _queue.put(_Item(path=path, added_at=time.monotonic()))

    def on_created(self, event) -> None:                # archivo creado/copiado
        print(f"DEBUG: Evento detectado en {event.src_path}")
        if not event.is_directory:
            self._enqueue(Path(str(event.src_path)))

    def on_moved(self, event) -> None:                  # archivo movido (drag-drop)
        if not event.is_directory:
            self._enqueue(Path(str(event.dest_path)))

# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Vigilante autónomo de hot_folder → Adobe Sensei → Cloudinary → Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EJEMPLOS:
  python scripts/vigilante_especimenes.py
  python scripts/vigilante_especimenes.py --folder ~/Desktop/fotos_mariposas
  python scripts/vigilante_especimenes.py --procesar-existentes
  python scripts/vigilante_especimenes.py --dry-run
  python scripts/vigilante_especimenes.py --reset-checkpoint
        """,
    )
    parser.add_argument(
        "--folder",
        default=str(DEFAULT_HOT_FOLDER),
        help=f"Carpeta a vigilar (default: {DEFAULT_HOT_FOLDER})",
    )
    parser.add_argument(
        "--procesados",
        default=str(DEFAULT_PROCESADOS),
        help=f"Carpeta destino tras éxito (default: {DEFAULT_PROCESADOS})",
    )
    parser.add_argument(
        "--procesar-existentes",
        action="store_true",
        help="Encolar archivos que ya están en la carpeta al arrancar",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simular sin subir nada (útil para probar el sistema)",
    )
    parser.add_argument(
        "--reset-checkpoint",
        action="store_true",
        help="Borrar checkpoint y reprocesar todos los archivos",
    )
    args = parser.parse_args()

    # Checkpoint
    if args.reset_checkpoint and CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        log.info("Checkpoint borrado — se reprocesará todo")
    checkpoint = _load_checkpoint()
    log.info("Checkpoint: %d archivos ya procesados", len(checkpoint))

    # Hot folder + destino de limpieza
    hot_folder = Path(args.folder)
    hot_folder.mkdir(parents=True, exist_ok=True)
    dest_dir = Path(args.procesados)
    dest_dir.mkdir(parents=True, exist_ok=True)

    # Arrancar worker thread (daemon: muere con el proceso principal)
    t = threading.Thread(
        target=_worker,
        args=(checkpoint, args.dry_run, dest_dir),
        daemon=True,
        name="worker",
    )
    t.start()
    log.info("Worker thread iniciado → limpia a %s", dest_dir)

    # Encolar archivos existentes si se pidió
    if args.procesar_existentes:
        existentes = [
            f for f in sorted(hot_folder.glob("*.*"))
            if f.suffix.lower() in SUPPORTED_EXT and str(f) not in checkpoint
        ]
        log.info(
            "Archivos existentes en la carpeta: %d pendientes de procesar",
            len(existentes),
        )
        for f in existentes:
            counters.inc("detected")
            _queue.put(_Item(path=f, added_at=time.monotonic()))

    # Arrancar watchdog
    handler  = _HotFolderHandler(checkpoint)
    observer = Observer()
    observer.schedule(handler, str(hot_folder), recursive=False)
    observer.start()

    # Banner
    print("\n" + "━" * 54)
    print("  VIGILANTE ACTIVO — LISTO PARA RECIBIR FOTOS")
    print("━" * 54)
    print(f"  Entrada:  {hot_folder}")
    print(f"  Salida:   {dest_dir}  (tras éxito)")
    print(f"  Modo:     {'DRY-RUN (sin subir)' if args.dry_run else 'PRODUCCIÓN'}")
    print(f"  Motor:    processor.py → Adobe Sensei → Cloudinary → Supabase")
    print("━" * 54)
    print("  Copia fotos a la entrada. Tras OK:")
    print("  procesados_finales/{PREFIJO}/archivo  (sin '_' → OTROS/)")
    print("  hot_folder queda vacía.  Ctrl+C para detener.")
    print("━" * 54 + "\n")

    # Bucle principal — imprime estado cada 30s
    last_print = time.monotonic()
    try:
        while True:
            time.sleep(1)
            if time.monotonic() - last_print >= 30:
                print(f"\n{'━'*54}")
                print(f"  {counters.resumen()}")
                print(f"  En cola: {_queue.qsize()}")
                print(f"{'━'*54}\n")
                last_print = time.monotonic()
    except KeyboardInterrupt:
        print("\n\nDeteniendo vigilante…")
        observer.stop()

    observer.join()
    _queue.join()   # terminar lo que hay en cola antes de salir

    print(f"\n{'━'*54}")
    print("  RESUMEN FINAL")
    print(f"  {counters.resumen()}")
    print(f"{'━'*54}\n")
    log.info("Vigilante detenido.")


if __name__ == "__main__":
    main()
