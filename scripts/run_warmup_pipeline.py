"""
FamilyPost Warmup-Kampagnen-Pipeline
=====================================

Automatisiert die 6 Pre-Launch "Warmup"-Posts:
  1. Liest Post-Texte aus marketing/warmup-posts.md (Ideen 1-6, je mit ### X,
     ### Instagram und optional ### Facebook Abschnitten).
  2. Erzeugt pro Idee einen 5-Sekunden Video-Clip im ZWEI-SCHRITT-ANSATZ ueber
     fal.ai (verzerrungsfreier als direktes Text-zu-Video):
       a) SCHRITT 1: ein gestochen scharfes Standbild via FLUX
          (Standardmodell: fal-ai/flux/dev).
       b) SCHRITT 2: Animation dieses Standbilds via Image-to-Video
          (Standardmodell: fal-ai/kling-video/v1.5/pro/image-to-video).
  3. (Logo-Overlay deaktiviert)
  4. Erstellt eine 16:9 Variante (fuer X) und eine 9:16 Variante (fuer
     Instagram/Facebook) pro Clip.
  5. Plant die Posts ueber die Buffer API (aktuelle GraphQL API unter
     https://api.buffer.com - siehe "WICHTIGE HINWEISE" unten) fuer die
     verbundenen Instagram-, Facebook- und X-Kanaele ein: Idee 6 zuerst,
     danach Idee 1-5 chronologisch (Standard: 1 Tag Abstand, 10:00 Europe/Berlin).
  6. Speichert verarbeitete Videos in outbox/warmup_media/ und einen
     Zusammenfassungs-Log in outbox/warmup_campaign_summary.json.

WICHTIGE HINWEISE / ANNAHMEN (bitte vor --live Ausfuehrung lesen)
------------------------------------------------------------------
* Buffer-API: Der Nutzer-Auftrag verlangte die LEGACY Buffer REST-Endpunkte
  (api.bufferapp.com/1/...). Live getestet: der vorhandene BUFFER_ACCESS_TOKEN
  ist ein "Public API token" fuer die AKTUELLE Buffer GraphQL-API
  (https://api.buffer.com) und wird von der Legacy-REST-API mit HTTP 401
  ("Public API tokens are not accepted for REST API access") abgelehnt. Die
  Legacy-REST-API wird zudem von Buffer selbst zum 2027-02-01 abgeschaltet.
  Dieses Skript nutzt daher bewusst die aktuelle GraphQL-API (funktional
  aequivalent: profiles -> channels, updates/create -> createPost).
* Buffer-Medien-Hosting: Die Buffer-API akzeptiert KEINEN Datei-Upload,
  sondern nur eine oeffentlich erreichbare HTTPS-URL pro Video/Bild. Dieses
  Skript laedt verarbeitete Videos daher direkt ueber fal_client.upload_file()
  in den fal.ai-Storage hoch (oeffentliche, stabile CDN-URL, z.B.
  https://v3.fal.media/files/...), sodass kein zusaetzliches Frontend-Deploy
  noetig ist, bevor ein Post-Zeitpunkt erreicht wird.
* Video-Backend: Es wurde zunaechst MiniMax verwendet; der MiniMax-Account
  hatte jedoch unzureichendes Guthaben ("insufficient balance"). Danach kam
  ein Ein-Schritt-Text-zu-Video-Modell (fal-ai/ltx-video) zum Einsatz, das
  jedoch zu Verzerrungen/Artefakten neigte. Das Skript nutzt daher jetzt den
  ZWEI-SCHRITT-ANSATZ: (1) fal-ai/flux/dev erzeugt ein scharfes Standbild aus
  dem Bild-Prompt, (2) fal-ai/kling-video/v1.5/pro/image-to-video animiert
  genau dieses Standbild (aspect_ratio=16:9, duration=5s) anhand eines
  generischen Animations-Prompts (ruhiger Kameraschwenk, keine Gesichts-
  verformung). Das liefert ein deutlich stabileres, verzerrungsfreies
  Ergebnis als direktes Text-zu-Video. Ueber --image-model/--video-model
  lassen sich andere fal.ai-Modelle waehlen (z.B. fal-ai/flux-pro/v1.1). Das
  Skript trimmt das animierte Ergebnis danach lokal auf exakt 5s und leitet
  die 9:16 Vertikal-Variante per lokalem Center-Crop ab (kein weiterer,
  kostenpflichtiger API-Call pro Kanal).
* Kosten & Sicherheit: fal.ai-Videogenerierung kostet echtes Geld, Buffer
  erstellt echte geplante Posts auf produktiven Social-Media-Konten. Das
  Skript laeuft daher standardmaessig im --dry-run Modus (keine fal.ai-
  Generierung, keine Buffer-Posts, nur Planung + Anzeige). Erst mit dem
  Flag --live werden echte API-Calls mit Kosten-/Publish-Wirkung ausgefuehrt.
* Deutsche Umlaute (ae, oe, ue, ss) werden NIEMALS transliteriert: alle
  Dateien werden mit UTF-8 gelesen/geschrieben (encoding="utf-8",
  ensure_ascii=False), sodass ae/oe/ue/ss ausschliesslich dann vorkommen,
  wenn sie so in der Quelle stehen.

Nutzung
-------
  python scripts/run_warmup_pipeline.py                 # Dry-Run (Standard)
  python scripts/run_warmup_pipeline.py --live           # Echte Ausfuehrung
  python scripts/run_warmup_pipeline.py --only-idea 6    # Nur eine Idee testen
  python scripts/run_warmup_pipeline.py --start-date 2026-01-10 --interval-days 2
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import requests
from dotenv import load_dotenv
import os

# --------------------------------------------------------------------------
# Konstanten & Konfiguration
# --------------------------------------------------------------------------

REPO_ROOT = Path(__file__).resolve().parent.parent
WARMUP_POSTS_MD = REPO_ROOT / "marketing" / "warmup-posts.md"
OUTBOX_DIR = REPO_ROOT / "outbox"
MEDIA_DIR = OUTBOX_DIR / "warmup_media"
SUMMARY_PATH = OUTBOX_DIR / "warmup_campaign_summary.json"

FAL_IMAGE_MODEL_DEFAULT = "fal-ai/flux/dev"
FAL_VIDEO_MODEL_DEFAULT = "fal-ai/kling-video/v1.5/pro/image-to-video"
CLIP_TARGET_SECONDS = 5.0

BUFFER_API_URL = "https://api.buffer.com"

TIMEZONE = ZoneInfo("Europe/Berlin")
POST_HOUR = 10  # 10:00 lokale Zeit

# Reihenfolge der Warmup-Ideen: Idee 6 zuerst (allererster Post), dann 1-5
IDEA_ORDER = [6, 1, 2, 3, 4, 5]

# SCHRITT 1: Bild-Prompts fuer die FLUX-Standbild-Generierung je Idee
# (Idee 6 ist der vom Nutzer woertlich vorgegebene Prompt; 1-5 sind analog
# als scharfe Fotomotive formuliert, abgeleitet aus denselben Bildmotiven).
IMAGE_PROMPTS: dict[int, str] = {
    6: (
        "Ultra-realistic sharp photo, POV shot of a hand holding a "
        "smartphone in a cozy kitchen, displaying a happy family photo on "
        "screen. Pinned to the refrigerator door directly behind the "
        "phone, a printed postcard of the same photo is partially visible. "
        "Sunlit warm atmosphere, 8k."
    ),
    1: (
        "Ultra-realistic professional photo, detail shot of warm color "
        "swatches, paper samples, and a beautifully printed postcard on a "
        "light wooden table, soft morning light, warm cozy mood, 8k "
        "resolution, sharp detail on paper texture."
    ),
    2: (
        "Ultra-realistic professional photo, a clean hand attaching a "
        "printed photo postcard with a magnet onto a white refrigerator "
        "door in a cozy kitchen, soft natural light, 8k resolution, sharp "
        "detail, real life feel."
    ),
    3: (
        "Ultra-realistic professional photo, macro close-up of hands "
        "gently touching textured paper and flipping a high-quality "
        "postcard over, warm sunlight, 8k resolution, highly detailed "
        "paper texture."
    ),
    4: (
        "Ultra-realistic professional photo, a smartphone displaying a "
        "family photo next to the same photo beautifully printed as a "
        "postcard standing on a wooden shelf, soft indoor light, 8k "
        "resolution, sharp detail."
    ),
    5: (
        "Ultra-realistic professional photo, a creative desk with paper "
        "proofs, notes, layout sketches, and a coffee mug in warm evening "
        "light, honest pre-launch workshop vibe, 8k resolution, sharp "
        "detail."
    ),
}

# SCHRITT 2: Generischer Animations-Prompt (vom Nutzer vorgegeben, woertlich),
# fuer alle Ideen gleich - animiert das jeweilige Standbild ruhig und ohne
# Gesichtsverformung.
ANIMATION_PROMPT = (
    "Subtle slow camera pan, soft sunlight flickering, realistic "
    "background blur, no facial morphing, calm 5-second movement."
)

# Ideen mit einem abweichenden, spezifischeren Animations-Prompt (ueberschreibt
# ANIMATION_PROMPT oben); alle anderen Ideen nutzen den generischen Prompt via
# ANIMATION_PROMPTS.get(idea, ANIMATION_PROMPT).
ANIMATION_PROMPTS: dict[int, str] = {
    6: (
        "The hand slowly moves the smartphone downwards and out of the "
        "frame. As the phone disappears, the camera focuses sharply on "
        "the real printed physical postcard pinned with a magnet to the "
        "refrigerator door. Smooth motion, perfect depth of field, 5 "
        "seconds."
    ),
}

# Buffer "service" Werte je Kanal-Typ, wie von der channels()-Query geliefert
SERVICE_INSTAGRAM = "instagram"
SERVICE_FACEBOOK = "facebook"
SERVICE_TWITTER = "twitter"  # X / Twitter Kanal wird von Buffer intern weiterhin "twitter" genannt


# --------------------------------------------------------------------------
# Datenklassen
# --------------------------------------------------------------------------

@dataclass
class IdeaContent:
    number: int
    title: str
    text_x: str
    text_instagram: str
    text_facebook: str  # Fallback: identisch zu text_instagram, falls nicht separat vorhanden


@dataclass
class GeneratedMedia:
    idea: int
    source_image: Path | None = None  # SCHRITT 1: FLUX-Standbild
    source_video: Path | None = None  # SCHRITT 2: animiertes Standbild
    landscape_video: Path | None = None  # 16:9, fuer X
    vertical_video: Path | None = None  # 9:16, fuer Instagram/Facebook
    fal_image_request_id: str | None = None
    fal_video_request_id: str | None = None
    error: str | None = None


@dataclass
class PostResult:
    idea: int
    channel_service: str
    channel_id: str | None
    scheduled_at_utc: str
    ok: bool = False
    dry_run: bool = True
    buffer_post_id: str | None = None
    public_media_url: str | None = None
    error: str | None = None


# --------------------------------------------------------------------------
# Markdown Parser
# --------------------------------------------------------------------------

def parse_warmup_posts(md_path: Path) -> dict[int, IdeaContent]:
    text = md_path.read_text(encoding="utf-8")

    idea_blocks = re.split(r"^## Idee (\d+): (.+)$", text, flags=re.MULTILINE)
    # re.split with groups returns: [preamble, num1, title1, body1, num2, title2, body2, ...]
    ideas: dict[int, IdeaContent] = {}
    for i in range(1, len(idea_blocks), 3):
        number = int(idea_blocks[i])
        title = idea_blocks[i + 1].strip()
        body = idea_blocks[i + 2]

        section_matches = list(
            re.finditer(r"^### (X|Instagram|Facebook).*?$\n(.*?)(?=^### |\Z)", body, flags=re.MULTILINE | re.DOTALL)
        )
        sections: dict[str, str] = {}
        for m in section_matches:
            name = m.group(1)
            content = m.group(2).strip()
            # Abschnitt endet oft an einer "---" Trennlinie
            content = re.split(r"^\s*---\s*$", content, flags=re.MULTILINE)[0].strip()
            sections[name] = content

        text_x = sections.get("X", "").strip()
        text_instagram = sections.get("Instagram", "").strip()
        text_facebook = sections.get("Facebook", "").strip() or text_instagram

        ideas[number] = IdeaContent(
            number=number,
            title=title,
            text_x=text_x,
            text_instagram=text_instagram,
            text_facebook=text_facebook,
        )

    return ideas


# --------------------------------------------------------------------------
# fal.ai Zwei-Schritt Medien-Generierung: SCHRITT 1 (FLUX-Standbild) +
# SCHRITT 2 (Image-to-Video-Animation)
# --------------------------------------------------------------------------

class FalError(RuntimeError):
    pass


def _import_fal_client():
    try:
        import fal_client  # type: ignore
        return fal_client
    except ImportError as exc:
        raise FalError("fal_client ist nicht installiert. Installieren mit: pip install fal-client") from exc


def fal_generate_image(prompt: str, api_key: str, model: str = FAL_IMAGE_MODEL_DEFAULT) -> dict:
    """SCHRITT 1: Sendet einen Text-zu-Bild-Request an fal.ai FLUX (queue-
    basierte API) und wartet synchron auf das Ergebnis. Gibt das rohe
    Ergebnis-Dict zurueck (enthaelt u.a. "images": [{"url": ...}])."""
    fal_client = _import_fal_client()
    # fal_client liest den Schluessel automatisch aus der Umgebungsvariable
    # FAL_KEY; hier zusaetzlich explizit setzen, falls .env erst spaeter geladen wurde.
    os.environ.setdefault("FAL_KEY", api_key)
    try:
        handler = fal_client.submit(model, arguments={"prompt": prompt})
        result = handler.get()
    except Exception as exc:  # noqa: BLE001 - alle fal.ai-Fehler als FalError weiterreichen
        raise FalError(f"fal.ai image_generation fehlgeschlagen (model={model}): {exc}") from exc
    result["_fal_request_id"] = getattr(handler, "request_id", None)
    return result


def fal_generate_video_from_image(
    image_url: str,
    prompt: str,
    api_key: str,
    model: str = FAL_VIDEO_MODEL_DEFAULT,
    aspect_ratio: str = "16:9",
    duration: str = "5",
) -> dict:
    """SCHRITT 2: Animiert ein vorhandenes Standbild (per URL) via fal.ai
    Image-to-Video und wartet synchron auf das Ergebnis. Gibt das rohe
    Ergebnis-Dict zurueck (enthaelt u.a. "video": {"url": ...})."""
    fal_client = _import_fal_client()
    os.environ.setdefault("FAL_KEY", api_key)
    try:
        handler = fal_client.submit(
            model,
            arguments={
                "image_url": image_url,
                "prompt": prompt,
                "aspect_ratio": aspect_ratio,
                "duration": duration,
            },
        )
        result = handler.get()
    except Exception as exc:  # noqa: BLE001 - alle fal.ai-Fehler als FalError weiterreichen
        raise FalError(f"fal.ai image_to_video fehlgeschlagen (model={model}): {exc}") from exc
    result["_fal_request_id"] = getattr(handler, "request_id", None)
    return result


def download_file(url: str, dest_path: Path) -> None:
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1 << 16):
                f.write(chunk)


def generate_fal_clip(
    idea: int,
    image_prompt: str,
    animation_prompt: str,
    api_key: str,
    image_model: str,
    video_model: str,
) -> tuple[Path, Path, str | None, str | None]:
    """Fuehrt den Zwei-Schritt-Ansatz fuer `idea` aus: (1) scharfes FLUX-
    Standbild erzeugen, (2) dieses Standbild per Image-to-Video animieren.
    Laedt beide Ergebnisse lokal herunter und gibt
    (bild_pfad, video_pfad, image_request_id, video_request_id) zurueck."""
    print(f"  [fal.ai] SCHRITT 1/2: erzeuge Standbild fuer Idee {idea} (model={image_model}) ...")
    image_result = fal_generate_image(image_prompt, api_key, model=image_model)
    images = image_result.get("images") or []
    if not images or not images[0].get("url"):
        raise FalError(f"fal.ai Bild-Antwort enthaelt keine Bild-URL: {image_result}")
    image_url = images[0]["url"]
    image_dest = MEDIA_DIR / f"idea_{idea}_source.jpg"
    print(f"  [fal.ai] lade Standbild herunter nach {image_dest} ...")
    download_file(image_url, image_dest)

    print(f"  [fal.ai] SCHRITT 2/2: animiere Standbild fuer Idee {idea} (model={video_model}) ...")
    video_result = fal_generate_video_from_image(image_url, animation_prompt, api_key, model=video_model)
    video_info = video_result.get("video") or {}
    video_url = video_info.get("url")
    if not video_url:
        raise FalError(f"fal.ai Video-Antwort enthaelt keine Video-URL: {video_result}")
    video_dest = MEDIA_DIR / f"idea_{idea}_source.mp4"
    print(f"  [fal.ai] lade animierten Clip herunter nach {video_dest} ...")
    download_file(video_url, video_dest)

    return image_dest, video_dest, image_result.get("_fal_request_id"), video_result.get("_fal_request_id")



# --------------------------------------------------------------------------
# Video Post-Processing (moviepy): trimmen, croppen, Logo einblenden
# --------------------------------------------------------------------------

def process_video_variants(source_path: Path, idea: int) -> tuple[Path, Path]:
    """Returns (landscape_16_9_path, vertical_9_16_path). Format-Cropping
    passiert IMMER zuerst."""
    from moviepy import VideoFileClip

    clip = VideoFileClip(str(source_path))
    duration = min(CLIP_TARGET_SECONDS, clip.duration)
    clip = clip.subclipped(0, duration)

    landscape_out = MEDIA_DIR / f"idea_{idea}_16x9.mp4"
    vertical_out = MEDIA_DIR / f"idea_{idea}_9x16.mp4"

    # SCHRITT 1: Format-Cropping zuerst (16:9 braucht kein Cropping, ist
    # bereits das native Seitenverhaeltnis der fal.ai-Animation)
    landscape_base = clip
    vertical_base = _crop_to_vertical(clip)
    vertical_base = _ensure_min_vertical_resolution(vertical_base)

    _write_video(landscape_base, landscape_out, clip)
    _write_video(vertical_base, vertical_out, clip)

    clip.close()
    return landscape_out, vertical_out


def _crop_to_vertical(clip, target_ratio: float = 9 / 16):
    w, h = clip.w, clip.h
    target_w = int(h * target_ratio)
    if target_w <= w:
        return clip.cropped(x_center=w / 2, y_center=h / 2, width=target_w, height=h)
    # Quelle ist schmaler als das Zielformat -> stattdessen Hoehe begrenzen
    target_h = int(w / target_ratio)
    return clip.cropped(x_center=w / 2, y_center=h / 2, width=w, height=min(h, target_h))


def _ensure_min_vertical_resolution(clip, min_width: int = 540, min_height: int = 960):
    """Skaliert einen 9:16-Clip bei Bedarf hoch, damit Mindestaufloesungen
    von Plattformen (z.B. Facebook Reels: mind. 540x960) eingehalten werden."""
    if clip.w >= min_width and clip.h >= min_height:
        return clip
    return clip.resized(height=max(min_height, clip.h))


def _write_video(final_clip, out_path: Path, original_clip) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fps = original_clip.fps or 24
    has_audio = original_clip.audio is not None
    final_clip.write_videofile(
        str(out_path),
        fps=fps,
        codec="libx264",
        audio=has_audio,
        audio_codec="aac" if has_audio else None,
        logger=None,
    )


# --------------------------------------------------------------------------
# Buffer GraphQL Client (aktuelle API, siehe Hinweis oben im Modul-Docstring)
# --------------------------------------------------------------------------

class BufferError(RuntimeError):
    pass


def buffer_graphql(query: str, variables: dict, access_token: str) -> dict:
    resp = requests.post(
        BUFFER_API_URL,
        json={"query": query, "variables": variables},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    data = resp.json()
    if resp.status_code != 200 or "errors" in data:
        raise BufferError(f"Buffer GraphQL error: HTTP {resp.status_code} body={data}")
    return data["data"]


def buffer_get_organization_id(access_token: str) -> str:
    query = "query { account { organizations { id name } } }"
    data = buffer_graphql(query, {}, access_token)
    orgs = data["account"]["organizations"]
    if not orgs:
        raise BufferError("No Buffer organization found for this account")
    return orgs[0]["id"]


def buffer_get_channels(organization_id: str, access_token: str) -> list[dict]:
    query = """
    query GetChannels($orgId: OrganizationId!) {
      channels(input: { organizationId: $orgId }) {
        id
        name
        service
        displayName
        isQueuePaused
      }
    }
    """
    data = buffer_graphql(query, {"orgId": organization_id}, access_token)
    return data["channels"]


def buffer_create_post(
    channel_id: str,
    channel_service: str,
    text: str,
    video_url: str,
    due_at_utc_iso: str,
    access_token: str,
) -> str:
    query = """
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post { id text dueAt channelId }
        }
        ... on MutationError {
          message
        }
      }
    }
    """
    variables = {
        "input": {
            "text": text,
            "channelId": channel_id,
            "schedulingType": "automatic",
            "mode": "customScheduled",
            "dueAt": due_at_utc_iso,
            "assets": [{"video": {"url": video_url}}],
        }
    }
    # Instagram und Facebook verlangen zusaetzlich einen expliziten Post-Typ
    # in der metadata (kurzes Video -> "reel"). X/Twitter benoetigt dies nicht.
    if channel_service == SERVICE_INSTAGRAM:
        variables["input"]["metadata"] = {
            "instagram": {"type": "reel", "shouldShareToFeed": True}
        }
    elif channel_service == SERVICE_FACEBOOK:
        variables["input"]["metadata"] = {"facebook": {"type": "reel"}}

    data = buffer_graphql(query, variables, access_token)
    result = data["createPost"]
    if "message" in result:
        raise BufferError(f"Buffer createPost failed: {result['message']}")
    return result["post"]["id"]


# --------------------------------------------------------------------------
# Scheduling
# --------------------------------------------------------------------------

def compute_schedule(start_date: datetime, interval_days: int, ideas: list[int]) -> dict[int, datetime]:
    schedule: dict[int, datetime] = {}
    for day_index, idea in enumerate(ideas):
        local_dt = datetime(
            start_date.year, start_date.month, start_date.day, POST_HOUR, 0, 0, tzinfo=TIMEZONE
        ) + timedelta(days=day_index * interval_days)
        schedule[idea] = local_dt
    return schedule


def to_utc_iso(dt: datetime) -> str:
    return dt.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%S.000Z")


# --------------------------------------------------------------------------
# Public Media Hosting Helper
# --------------------------------------------------------------------------

def upload_public_video(local_path: Path) -> str:
    """Laedt eine lokale Videodatei ueber fal_client in den fal.ai-Storage
    hoch und gibt die oeffentliche, stabile Zugriffs-URL zurueck. Buffer
    kann Medien nur ueber eine oeffentliche HTTPS-URL einbinden."""
    import fal_client  # type: ignore

    url = fal_client.upload_file(str(local_path))
    return url


# --------------------------------------------------------------------------
# Main Orchestration
# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description="FamilyPost Warmup-Kampagnen-Pipeline")
    parser.add_argument("--live", action="store_true", help="Echte Ausfuehrung (kostet Geld, erstellt echte Buffer-Posts). Ohne dieses Flag: Dry-Run.")
    parser.add_argument("--only-idea", type=int, default=None, help="Nur diese eine Idee verarbeiten (1-6)")
    parser.add_argument("--skip-idea", type=int, default=None, help="Diese eine Idee ueberspringen (z.B. 6)")
    parser.add_argument("--start-date", type=str, default=None, help="YYYY-MM-DD, Standard: morgen")
    parser.add_argument("--interval-days", type=int, default=1, help="Tage zwischen den Posts (Standard: 1)")
    parser.add_argument("--skip-generation", action="store_true", help="fal.ai-Generierung ueberspringen und vorhandene outbox/warmup_media/idea_N_source.mp4 wiederverwenden")
    parser.add_argument("--image-model", type=str, default=FAL_IMAGE_MODEL_DEFAULT, help=f"fal.ai Bild-Modell fuer SCHRITT 1 (Standard: {FAL_IMAGE_MODEL_DEFAULT}, z.B. auch fal-ai/flux-pro/v1.1)")
    parser.add_argument("--video-model", type=str, default=FAL_VIDEO_MODEL_DEFAULT, help=f"fal.ai Image-to-Video-Modell fuer SCHRITT 2 (Standard: {FAL_VIDEO_MODEL_DEFAULT})")
    args = parser.parse_args()

    load_dotenv(REPO_ROOT / ".env")
    fal_api_key = os.getenv("FAL_KEY")
    buffer_access_token = os.getenv("BUFFER_ACCESS_TOKEN")

    if not fal_api_key:
        print("FEHLER: FAL_KEY fehlt in .env", file=sys.stderr)
        return 1
    if not buffer_access_token:
        print("FEHLER: BUFFER_ACCESS_TOKEN fehlt in .env", file=sys.stderr)
        return 1

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)

    mode_label = "LIVE (echte Kosten & echte Buffer-Posts)" if args.live else "DRY-RUN (keine Kosten, keine echten Posts)"
    print(f"=== FamilyPost Warmup-Pipeline -- Modus: {mode_label} ===\n")

    # 1) Markdown parsen
    print(f"[1/5] Lese {WARMUP_POSTS_MD.relative_to(REPO_ROOT)} ...")
    ideas = parse_warmup_posts(WARMUP_POSTS_MD)
    missing = [n for n in IDEA_ORDER if n not in ideas]
    if missing:
        print(f"FEHLER: Ideen nicht gefunden in warmup-posts.md: {missing}", file=sys.stderr)
        return 1
    print(f"      -> {len(ideas)} Ideen geladen: {sorted(ideas)}\n")

    ideas_to_process = [args.only_idea] if args.only_idea else IDEA_ORDER
    if args.skip_idea is not None:
        ideas_to_process = [i for i in ideas_to_process if i != args.skip_idea]

    # 2) Zeitplan berechnen
    if args.start_date:
        start_date = datetime.strptime(args.start_date, "%Y-%m-%d")
    else:
        start_date = datetime.now(TIMEZONE) + timedelta(days=1)
    schedule = compute_schedule(start_date, args.interval_days, ideas_to_process)
    print("[2/5] Zeitplan (Europe/Berlin, 10:00):")
    for idea in ideas_to_process:
        print(f"      Idee {idea}: {schedule[idea].strftime('%Y-%m-%d %H:%M %Z')}")
    print()

    # 3) Buffer-Kanaele ermitteln (read-only, sicher auch im Dry-Run)
    print("[3/5] Ermittle Buffer-Organisation und -Kanaele ...")
    try:
        organization_id = buffer_get_organization_id(buffer_access_token)
        channels = buffer_get_channels(organization_id, buffer_access_token)
    except BufferError as e:
        print(f"FEHLER beim Buffer-Zugriff: {e}", file=sys.stderr)
        return 1
    channels_by_service: dict[str, dict] = {}
    for ch in channels:
        channels_by_service.setdefault(ch["service"], ch)
    for service in (SERVICE_INSTAGRAM, SERVICE_FACEBOOK, SERVICE_TWITTER):
        ch = channels_by_service.get(service)
        status = f"{ch['name']} ({ch['id']})" if ch else "NICHT VERBUNDEN"
        print(f"      {service:10s} -> {status}")
    print()

    # 4) Medien generieren + verarbeiten
    print("[4/5] Generiere (FLUX-Standbild + Image-to-Video-Animation) & verarbeite Clips ...")
    media_results: dict[int, GeneratedMedia] = {}
    for idea in ideas_to_process:
        print(f"  -- Idee {idea}: {ideas[idea].title}")
        gm = GeneratedMedia(idea=idea)
        media_results[idea] = gm
        source_path = MEDIA_DIR / f"idea_{idea}_source.mp4"
        try:
            if not args.live:
                print("     [dry-run] fal.ai-Generierung uebersprungen (keine Kosten).")
            elif args.skip_generation and source_path.exists():
                print(f"     Nutze vorhandenen Clip: {source_path}")
            else:
                image_path, source_path, image_request_id, video_request_id = generate_fal_clip(
                    idea,
                    IMAGE_PROMPTS[idea],
                    ANIMATION_PROMPTS.get(idea, ANIMATION_PROMPT),
                    fal_api_key,
                    args.image_model,
                    args.video_model,
                )
                gm.source_image = image_path
                gm.fal_image_request_id = image_request_id
                gm.fal_video_request_id = video_request_id
            gm.source_video = source_path if source_path.exists() else None

            if args.live and gm.source_video:
                print("     Erzeuge 16:9- und 9:16-Varianten ...")
                landscape, vertical = process_video_variants(gm.source_video, idea)
                gm.landscape_video = landscape
                gm.vertical_video = vertical
        except Exception as e:  # noqa: BLE001 - Fehler pro Idee sollen die Pipeline nicht abbrechen
            gm.error = str(e)
            print(f"     FEHLER: {e}")
    print()

    # 5) Buffer-Posts planen
    print("[5/5] Plane Buffer-Posts ...")
    post_results: list[PostResult] = []
    for idea in ideas_to_process:
        content = ideas[idea]
        gm = media_results[idea]
        due_at_iso = to_utc_iso(schedule[idea])

        channel_specs = [
            (SERVICE_INSTAGRAM, content.text_instagram, gm.vertical_video),
            (SERVICE_FACEBOOK, content.text_facebook, gm.vertical_video),
            (SERVICE_TWITTER, content.text_x, gm.landscape_video),
        ]
        for service, text, video_path in channel_specs:
            ch = channels_by_service.get(service)
            pr = PostResult(
                idea=idea,
                channel_service=service,
                channel_id=ch["id"] if ch else None,
                scheduled_at_utc=due_at_iso,
                dry_run=not args.live,
            )
            post_results.append(pr)

            if ch is None:
                pr.error = "Kein verbundener Kanal fuer diesen Service gefunden"
                print(f"  Idee {idea} / {service}: UEBERSPRUNGEN ({pr.error})")
                continue

            if not args.live:
                print(f"  [dry-run] Idee {idea} / {service} -> {ch['name']} @ {due_at_iso} (Text: {text[:40]!r}...)")
                pr.ok = True
                continue

            if not video_path or not video_path.exists():
                pr.error = "Kein verarbeitetes Video vorhanden"
                print(f"  Idee {idea} / {service}: FEHLER ({pr.error})")
                continue

            try:
                public_url = upload_public_video(video_path)
                pr.public_media_url = public_url
                post_id = buffer_create_post(ch["id"], service, text, public_url, due_at_iso, buffer_access_token)
                pr.buffer_post_id = post_id
                pr.ok = True
                print(f"  Idee {idea} / {service}: OK -> Post-ID {post_id} @ {due_at_iso}")
            except BufferError as e:
                pr.error = str(e)
                print(f"  Idee {idea} / {service}: FEHLER ({e})")

    # Zusammenfassung speichern
    OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
    summary = {
        "generated_at": datetime.now(TIMEZONE).isoformat(),
        "mode": "live" if args.live else "dry_run",
        "schedule": {str(k): v.isoformat() for k, v in schedule.items()},
        "media": {
            str(idea): {
                "source_image": str(gm.source_image) if gm.source_image else None,
                "source_video": str(gm.source_video) if gm.source_video else None,
                "landscape_video": str(gm.landscape_video) if gm.landscape_video else None,
                "vertical_video": str(gm.vertical_video) if gm.vertical_video else None,
                "fal_image_request_id": gm.fal_image_request_id,
                "fal_video_request_id": gm.fal_video_request_id,
                "error": gm.error,
            }
            for idea, gm in media_results.items()
        },
        "posts": [
            {
                "idea": pr.idea,
                "channel_service": pr.channel_service,
                "channel_id": pr.channel_id,
                "scheduled_at_utc": pr.scheduled_at_utc,
                "ok": pr.ok,
                "dry_run": pr.dry_run,
                "buffer_post_id": pr.buffer_post_id,
                "public_media_url": pr.public_media_url,
                "error": pr.error,
            }
            for pr in post_results
        ],
    }
    SUMMARY_PATH.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    # Terminal-Zusammenfassung
    print("\n=== ZUSAMMENFASSUNG ===")
    for idea in ideas_to_process:
        gm = media_results[idea]
        media_status = "OK" if (not args.live or (gm.landscape_video and gm.vertical_video)) else f"FEHLER ({gm.error})"
        print(f"Idee {idea} ({ideas[idea].title}): Medien {media_status}")
        for pr in post_results:
            if pr.idea != idea:
                continue
            mark = "OK" if pr.ok else "FEHLGESCHLAGEN"
            print(f"    - {pr.channel_service:10s} {mark:14s} @ {pr.scheduled_at_utc}" + (f" ({pr.error})" if pr.error else ""))
    print(f"\nZusammenfassung gespeichert: {SUMMARY_PATH.relative_to(REPO_ROOT)}")
    if not args.live:
        print("\nHinweis: Dies war ein DRY-RUN. Fuehre mit --live aus, um echte Videos zu generieren")
        print("und echte Buffer-Posts zu erstellen (verursacht Kosten und veroeffentlicht Inhalte).")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
