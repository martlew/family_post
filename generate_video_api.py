#!/usr/bin/env python3
"""Generate video clips from shot configs and maintain a centralized metadata library.

Key behaviors:
- Reads shot configs from JSON/YAML files.
- Supports both legacy shot schema and the new extended knowledge schema.
- Generates videos via fal.ai or Gradio providers.
- Writes/updates centralized knowledge objects at creative/metadata/<shot_id>.json.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from base64 import b64encode
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests

VIDEO_SUFFIXES = {".mp4", ".mov", ".webm", ".mkv", ".gif"}
SHOT_FILE_SUFFIXES = {".json", ".yaml", ".yml"}
SHOT_ID_PREFIX_TO_DIR = {
    "emotion": Path("creative/shots/emotions"),
    "people": Path("creative/shots/people"),
    "post": Path("creative/shots/post"),
    "family": Path("creative/shots/family"),
    "season": Path("creative/shots/seasons"),
    "place": Path("creative/shots/places"),
}

LEGACY_REQUIRED_FIELDS: dict[str, type[Any]] = {
    "id": str,
    "emotion": str,
    "people": list,
    "country": str,
    "season": str,
    "lighting": str,
    "camera": str,
    "duration": (int, float),
    "usable_for": list,
    "contains_text": bool,
    "contains_phone": bool,
    "contains_logo": bool,
    "prompt_string": str,
}

STORY_ROLES = {
    "hook",
    "setup",
    "conflict",
    "transition",
    "reveal",
    "emotional_peak",
    "resolution",
    "outro",
    "cta_background",
}

MARKETING_GOALS = {"hook", "emotion", "trust", "product_features"}
FUNNEL_STAGES = {"awareness", "consideration", "conversion"}
CTA_STRENGTH = {"low", "medium", "high"}


@dataclass
class ShotConfig:
    id: str
    prompt_string: str
    knowledge: dict[str, Any]
    source_file: Path
    model: str | None = None
    provider_args: dict[str, Any] | None = None
    image_url: str | None = None
    source_image: str | None = None


class ProviderBase:
    def generate(self, shot: ShotConfig, prompt: str, default_extra_args: dict[str, Any]) -> Any:
        raise NotImplementedError


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def parse_extra_args(raw: str | None) -> dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError("--extra-args must be valid JSON") from exc

    if not isinstance(parsed, dict):
        raise ValueError("--extra-args must decode to a JSON object")

    return parsed


def load_yaml(path: Path) -> dict[str, Any]:
    try:
        import yaml  # type: ignore
    except ImportError as exc:
        raise RuntimeError(
            f"YAML file detected ({path.name}) but PyYAML is not installed. Install with: pip install pyyaml"
        ) from exc

    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Shot file {path} must contain an object at top level")
    return data


def load_shot_file(path: Path) -> dict[str, Any]:
    suffix = path.suffix.lower()
    if suffix == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError(f"Shot file {path} must contain an object at top level")
        return data

    if suffix in {".yaml", ".yml"}:
        return load_yaml(path)

    raise ValueError(f"Unsupported shot file format: {path}")


def collect_shot_files(shots_dir: Path, single_file: Path | None) -> list[Path]:
    if single_file:
        if not single_file.exists():
            raise FileNotFoundError(f"Shot file not found: {single_file}")
        return [single_file]

    if not shots_dir.exists():
        raise FileNotFoundError(f"Shots directory not found: {shots_dir}")

    files = [p for p in shots_dir.rglob("*") if p.is_file() and p.suffix.lower() in SHOT_FILE_SUFFIXES]
    files.sort()
    return files


def _assert_list_of_strings(value: Any, field_name: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"Field '{field_name}' must be an array of strings")
    return value


def _assert_bool(value: Any, field_name: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"Field '{field_name}' must be a boolean")
    return value


def validate_extended_knowledge_schema(obj: dict[str, Any]) -> None:
    required_top = {
        "id",
        "primary_emotion",
        "secondary_emotions",
        "emotion_intensity",
        "story_role",
        "marketing",
        "campaigns",
        "target_audience",
        "camera",
        "color_palette_mood",
        "focus",
        "editing",
        "quality",
        "technical",
    }

    missing_top = [key for key in required_top if key not in obj]
    if missing_top:
        raise ValueError(f"Missing top-level fields: {', '.join(missing_top)}")

    if not isinstance(obj["id"], str) or not obj["id"].strip():
        raise ValueError("Field 'id' must be a non-empty string")

    if not isinstance(obj["primary_emotion"], str) or not obj["primary_emotion"].strip():
        raise ValueError("Field 'primary_emotion' must be a non-empty string")

    _assert_list_of_strings(obj["secondary_emotions"], "secondary_emotions")

    if not isinstance(obj["emotion_intensity"], int) or not (1 <= obj["emotion_intensity"] <= 10):
        raise ValueError("Field 'emotion_intensity' must be an integer from 1 to 10")

    if obj["story_role"] not in STORY_ROLES:
        raise ValueError(f"Field 'story_role' must be one of: {', '.join(sorted(STORY_ROLES))}")

    marketing = obj["marketing"]
    if not isinstance(marketing, dict):
        raise ValueError("Field 'marketing' must be an object")
    for key in ["marketing_goal", "funnel_stage", "cta_strength"]:
        if key not in marketing:
            raise ValueError(f"Field 'marketing.{key}' is required")

    marketing_goal = _assert_list_of_strings(marketing["marketing_goal"], "marketing.marketing_goal")
    if any(goal not in MARKETING_GOALS for goal in marketing_goal):
        raise ValueError(f"Field 'marketing.marketing_goal' supports only: {', '.join(sorted(MARKETING_GOALS))}")

    funnel_stage = _assert_list_of_strings(marketing["funnel_stage"], "marketing.funnel_stage")
    if any(stage not in FUNNEL_STAGES for stage in funnel_stage):
        raise ValueError(f"Field 'marketing.funnel_stage' supports only: {', '.join(sorted(FUNNEL_STAGES))}")

    if marketing["cta_strength"] not in CTA_STRENGTH:
        raise ValueError(f"Field 'marketing.cta_strength' must be one of: {', '.join(sorted(CTA_STRENGTH))}")

    _assert_list_of_strings(obj["campaigns"], "campaigns")
    _assert_list_of_strings(obj["target_audience"], "target_audience")
    _assert_list_of_strings(obj["focus"], "focus")

    if not isinstance(obj["color_palette_mood"], str) or not obj["color_palette_mood"].strip():
        raise ValueError("Field 'color_palette_mood' must be a non-empty string")

    camera = obj["camera"]
    if not isinstance(camera, dict):
        raise ValueError("Field 'camera' must be an object")
    for key in ["shot_size", "movement", "lens", "angle"]:
        if key not in camera:
            raise ValueError(f"Field 'camera.{key}' is required")
        if not isinstance(camera[key], str) or not camera[key].strip():
            raise ValueError(f"Field 'camera.{key}' must be a non-empty string")

    editing = obj["editing"]
    if not isinstance(editing, dict):
        raise ValueError("Field 'editing' must be an object")
    _assert_bool(editing.get("good_intro"), "editing.good_intro")
    _assert_bool(editing.get("good_outro"), "editing.good_outro")
    _assert_bool(editing.get("transition_friendly"), "editing.transition_friendly")

    quality = obj["quality"]
    if not isinstance(quality, dict):
        raise ValueError("Field 'quality' must be an object")
    _assert_bool(quality.get("stable_hands"), "quality.stable_hands")
    _assert_bool(quality.get("stable_face"), "quality.stable_face")
    _assert_bool(quality.get("artifacts"), "quality.artifacts")
    _assert_bool(quality.get("usable"), "quality.usable")

    technical = obj["technical"]
    if not isinstance(technical, dict):
        raise ValueError("Field 'technical' must be an object")
    for key in ["duration", "contains_text", "contains_phone", "contains_logo", "prompt_string"]:
        if key not in technical:
            raise ValueError(f"Field 'technical.{key}' is required")

    if not isinstance(technical["duration"], str) or not technical["duration"].strip():
        raise ValueError("Field 'technical.duration' must be a non-empty string")

    _assert_bool(technical["contains_text"], "technical.contains_text")
    _assert_bool(technical["contains_phone"], "technical.contains_phone")
    _assert_bool(technical["contains_logo"], "technical.contains_logo")

    if not isinstance(technical["prompt_string"], str) or not technical["prompt_string"].strip():
        raise ValueError("Field 'technical.prompt_string' must be a non-empty string")


def cap_prompt(prompt: str, limit: int) -> str:
    normalized = " ".join(prompt.split())
    if len(normalized) <= limit:
        return normalized
    trimmed = normalized[:limit].rsplit(" ", 1)[0].rstrip()
    return trimmed + "."


def infer_story_role(usable_for: list[str]) -> str:
    lowered = {item.lower() for item in usable_for}
    if "hook" in lowered:
        return "hook"
    if "cta" in lowered:
        return "cta_background"
    if "emotion" in lowered:
        return "emotional_peak"
    return "setup"


def infer_marketing_goal(usable_for: list[str]) -> list[str]:
    mapping = {
        "hook": "hook",
        "emotion": "emotion",
        "trust": "trust",
        "memory": "emotion",
        "product": "product_features",
        "features": "product_features",
    }
    goals: list[str] = []
    for item in usable_for:
        mapped = mapping.get(item.lower())
        if mapped and mapped not in goals:
            goals.append(mapped)

    if not goals:
        goals = ["emotion"]

    return goals


def infer_camera_object(camera_text: str) -> dict[str, str]:
    lower = camera_text.lower()

    movement = "tracking"
    if "static" in lower:
        movement = "static"
    elif "pan" in lower:
        movement = "pan"
    elif "tilt" in lower:
        movement = "tilt"

    lens = "50mm"
    if "85mm" in lower:
        lens = "85mm"
    elif "35mm" in lower:
        lens = "35mm"

    shot_size = "medium_shot"
    if "close" in lower:
        shot_size = "close_up"
    elif "wide" in lower:
        shot_size = "wide_shot"

    angle = "eye_level"
    if "high angle" in lower:
        angle = "high_angle"
    elif "low angle" in lower:
        angle = "low_angle"

    return {
        "shot_size": shot_size,
        "movement": movement,
        "lens": lens,
        "angle": angle,
    }


def build_extended_from_legacy(raw: dict[str, Any]) -> dict[str, Any]:
    missing = [field for field in LEGACY_REQUIRED_FIELDS if field not in raw]
    if missing:
        raise ValueError(f"Missing legacy fields: {', '.join(missing)}")

    for field_name, expected in LEGACY_REQUIRED_FIELDS.items():
        if not isinstance(raw[field_name], expected):
            raise ValueError(
                f"Legacy field '{field_name}' must be type {expected}, got {type(raw[field_name]).__name__}"
            )

    people = _assert_list_of_strings(raw["people"], "people")
    usable_for = _assert_list_of_strings(raw["usable_for"], "usable_for")

    primary_emotion = str(raw["emotion"]).strip() or "nostalgia"
    emotion_intensity = 8 if "nostalgia" in primary_emotion.lower() else 7

    extended = {
        "id": str(raw["id"]).strip(),
        "primary_emotion": primary_emotion,
        "secondary_emotions": ["gratitude"],
        "emotion_intensity": emotion_intensity,
        "story_role": infer_story_role(usable_for),
        "marketing": {
            "marketing_goal": infer_marketing_goal(usable_for),
            "funnel_stage": ["awareness", "consideration"],
            "cta_strength": "low",
        },
        "campaigns": ["everyday", "grandparents_day"],
        "target_audience": ["grandchildren", "families"],
        "camera": infer_camera_object(str(raw["camera"])),
        "color_palette_mood": "warm_golden_natural",
        "focus": ["face", "postcard", "hands"],
        "editing": {
            "good_intro": False,
            "good_outro": False,
            "transition_friendly": True,
        },
        "quality": {
            "stable_hands": True,
            "stable_face": True,
            "artifacts": False,
            "usable": True,
        },
        "technical": {
            "duration": f"{float(raw['duration']):g}s",
            "contains_text": bool(raw["contains_text"]),
            "contains_phone": bool(raw["contains_phone"]),
            "contains_logo": bool(raw["contains_logo"]),
            "prompt_string": str(raw["prompt_string"]).strip(),
        },
    }

    validate_extended_knowledge_schema(extended)
    return extended


def build_shot_config(raw: dict[str, Any], source_file: Path, prompt_max_len: int) -> ShotConfig:
    runtime = raw.get("runtime") if isinstance(raw.get("runtime"), dict) else {}

    if "primary_emotion" in raw and "technical" in raw:
        knowledge = {
            "id": raw.get("id"),
            "primary_emotion": raw.get("primary_emotion"),
            "secondary_emotions": raw.get("secondary_emotions"),
            "emotion_intensity": raw.get("emotion_intensity"),
            "story_role": raw.get("story_role"),
            "marketing": raw.get("marketing"),
            "campaigns": raw.get("campaigns"),
            "target_audience": raw.get("target_audience"),
            "camera": raw.get("camera"),
            "color_palette_mood": raw.get("color_palette_mood"),
            "focus": raw.get("focus"),
            "editing": raw.get("editing"),
            "quality": raw.get("quality"),
            "technical": raw.get("technical"),
        }
        validate_extended_knowledge_schema(knowledge)
    else:
        knowledge = build_extended_from_legacy(raw)

    prompt = cap_prompt(knowledge["technical"]["prompt_string"], prompt_max_len)
    knowledge["technical"]["prompt_string"] = prompt

    if not isinstance(runtime, dict):
        raise ValueError(f"Field 'runtime' in {source_file} must be an object")

    provider_args = runtime.get("provider_args")
    if provider_args is not None and not isinstance(provider_args, dict):
        raise ValueError(f"Field 'runtime.provider_args' in {source_file} must be an object")

    model = runtime.get("model")
    if model is not None and not isinstance(model, str):
        raise ValueError(f"Field 'runtime.model' in {source_file} must be a string")

    image_url = runtime.get("image_url")
    if image_url is not None and not isinstance(image_url, str):
        raise ValueError(f"Field 'runtime.image_url' in {source_file} must be a string")

    source_image = runtime.get("source_image")
    if source_image is not None and not isinstance(source_image, str):
        raise ValueError(f"Field 'runtime.source_image' in {source_file} must be a string")

    return ShotConfig(
        id=knowledge["id"],
        prompt_string=prompt,
        knowledge=knowledge,
        source_file=source_file,
        model=model,
        provider_args=provider_args,
        image_url=image_url,
        source_image=source_image,
    )


def image_to_data_url(image_path: Path) -> str:
    suffix = image_path.suffix.lower()
    mime = "image/png"
    if suffix in {".jpg", ".jpeg"}:
        mime = "image/jpeg"
    elif suffix == ".webp":
        mime = "image/webp"

    encoded = b64encode(image_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def resolve_source_image(shot: ShotConfig, image_str: str) -> Path:
    image_path = Path(image_str)
    if image_path.is_absolute():
        return image_path

    relative_to_shot = (shot.source_file.parent / image_path).resolve()
    if relative_to_shot.exists():
        return relative_to_shot

    return (Path.cwd() / image_path).resolve()


class FalProvider(ProviderBase):
    def __init__(self, default_model: str) -> None:
        self.default_model = default_model
        try:
            import fal_client  # type: ignore
        except ImportError as exc:
            raise RuntimeError("fal_client is not installed. Install with: pip install fal-client") from exc
        self.fal_client = fal_client

    def _resolve_image_url(self, shot: ShotConfig) -> str | None:
        if shot.image_url:
            return shot.image_url

        if not shot.source_image:
            return None

        image_path = resolve_source_image(shot, shot.source_image)
        if not image_path.exists():
            raise FileNotFoundError(f"Source image not found: {image_path}")

        if hasattr(self.fal_client, "upload_file"):
            uploaded = self.fal_client.upload_file(str(image_path))
            return uploaded if isinstance(uploaded, str) else str(uploaded)

        return image_to_data_url(image_path)

    def generate(self, shot: ShotConfig, prompt: str, default_extra_args: dict[str, Any]) -> Any:
        model = shot.model or self.default_model

        arguments: dict[str, Any] = {"prompt": prompt}
        arguments.update(default_extra_args)
        if shot.provider_args:
            arguments.update(shot.provider_args)

        image_url = self._resolve_image_url(shot)
        if image_url:
            arguments.setdefault("image_url", image_url)

        handler = self.fal_client.submit(model, arguments=arguments)
        return handler.get()


class GradioProvider(ProviderBase):
    def __init__(self, space: str, api_name: str) -> None:
        self.api_name = api_name
        try:
            from gradio_client import Client  # type: ignore
        except ImportError as exc:
            raise RuntimeError("gradio_client is not installed. Install with: pip install gradio-client") from exc

        self.client = Client(space)

    def generate(self, shot: ShotConfig, prompt: str, default_extra_args: dict[str, Any]) -> Any:
        merged_args = dict(default_extra_args)
        if shot.provider_args:
            merged_args.update(shot.provider_args)

        if "args" in merged_args:
            args = [prompt, *merged_args["args"]]
            return self.client.predict(*args, api_name=self.api_name)

        kwargs = dict(merged_args.get("kwargs", {}))
        kwargs.setdefault("prompt", prompt)
        return self.client.predict(api_name=self.api_name, **kwargs)


def build_provider(args: argparse.Namespace) -> ProviderBase:
    if args.provider == "fal":
        return FalProvider(default_model=args.model)
    if args.provider == "gradio":
        return GradioProvider(space=args.space, api_name=args.api_name)
    raise ValueError(f"Unsupported provider: {args.provider}")


def extract_media_strings(value: Any) -> list[str]:
    media: list[str] = []

    if isinstance(value, str):
        lower = value.lower()
        if lower.startswith("http://") or lower.startswith("https://"):
            return [value]
        if any(lower.endswith(suffix) for suffix in VIDEO_SUFFIXES):
            # Bare filenames from provider payloads (e.g. file_name) are not local files.
            # We only keep local-looking paths and let URL extraction handle hosted files.
            path = Path(value)
            if path.is_absolute() or len(path.parts) > 1:
                return [value]
        return []

    if isinstance(value, dict):
        direct_url = value.get("url")
        if isinstance(direct_url, str) and direct_url.startswith(("http://", "https://")):
            return [direct_url]

        for item in value.values():
            media.extend(extract_media_strings(item))

        # Deduplicate while preserving order and prefer URLs when available.
        unique = list(dict.fromkeys(media))
        url_first = [item for item in unique if item.startswith(("http://", "https://"))]
        return url_first or unique

    if isinstance(value, list):
        for item in value:
            media.extend(extract_media_strings(item))
        unique = list(dict.fromkeys(media))
        url_first = [item for item in unique if item.startswith(("http://", "https://"))]
        return url_first or unique

    return []


def resolve_output_dir(default_out_dir: Path, shot_id: str) -> Path:
    if default_out_dir != Path("creative/exports"):
        return default_out_dir

    prefix = shot_id.split("_", 1)[0].lower()
    return SHOT_ID_PREFIX_TO_DIR.get(prefix, default_out_dir)


def extension_from_media(media: str) -> str:
    if media.startswith("http://") or media.startswith("https://"):
        parsed = urlparse(media)
        suffix = Path(parsed.path).suffix.lower()
        return suffix if suffix in VIDEO_SUFFIXES else ".mp4"

    suffix = Path(media).suffix.lower()
    return suffix if suffix in VIDEO_SUFFIXES else ".mp4"


def download_file(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, timeout=240, stream=True) as response:
        response.raise_for_status()
        with dest.open("wb") as handle:
            for chunk in response.iter_content(chunk_size=1024 * 64):
                if chunk:
                    handle.write(chunk)


def save_media_file(media: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if media.startswith("http://") or media.startswith("https://"):
        download_file(media, dest)
        return

    source = Path(media)
    if not source.is_absolute():
        source = (Path.cwd() / source).resolve()

    if not source.exists():
        raise FileNotFoundError(f"Generated media path not found: {source}")

    shutil.copy2(source, dest)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate clips and centralized metadata from modular shot files")
    parser.add_argument("--provider", choices=["fal", "gradio"], default="fal")

    parser.add_argument(
        "--model",
        default="fal-ai/hunyuan-video",
        help="Default fal.ai model id (can be overridden per shot in runtime.model)",
    )
    parser.add_argument(
        "--space",
        default="multimodalart/hunyuan-video",
        help="Gradio Space id owner/space (used when --provider=gradio)",
    )
    parser.add_argument(
        "--api-name",
        default="/predict",
        help="Gradio api_name endpoint (used when --provider=gradio)",
    )

    parser.add_argument("--shots-dir", default="creative/shots", help="Root folder containing shot JSON/YAML files")
    parser.add_argument("--shot-file", default="", help="Optional single shot file path")
    parser.add_argument("--out-dir", default="creative/exports", help="Output folder for generated videos")
    parser.add_argument(
        "--metadata-dir",
        default="creative/metadata",
        help="Central folder for generated knowledge JSON objects",
    )
    parser.add_argument(
        "--extra-args",
        default="",
        help="JSON object with provider defaults, e.g. '{\"duration\":5}'",
    )
    parser.add_argument("--prompt-max-len", type=int, default=900, help="Hard max prompt length")
    parser.add_argument("--limit", type=int, default=0, help="Only generate first N shots after load/sort")
    parser.add_argument("--sleep", type=float, default=0.0, help="Optional delay in seconds between requests")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print without sending API calls")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        default_extra_args = parse_extra_args(args.extra_args)
    except Exception as exc:
        print(f"[error] Invalid --extra-args: {exc}", file=sys.stderr)
        return 1

    shots_dir = Path(args.shots_dir)
    single_file = Path(args.shot_file) if args.shot_file else None

    try:
        shot_files = collect_shot_files(shots_dir=shots_dir, single_file=single_file)
    except Exception as exc:
        print(f"[error] Could not locate shot files: {exc}", file=sys.stderr)
        return 1

    if not shot_files:
        print("[error] No shot files found. Add JSON/YAML files under creative/shots.", file=sys.stderr)
        return 1

    if args.limit > 0:
        shot_files = shot_files[: args.limit]

    shots: list[ShotConfig] = []
    for shot_file in shot_files:
        try:
            raw = load_shot_file(shot_file)
            shot = build_shot_config(raw=raw, source_file=shot_file, prompt_max_len=args.prompt_max_len)
            shots.append(shot)
        except Exception as exc:
            print(f"[error] Invalid shot file {shot_file}: {exc}", file=sys.stderr)
            return 1

    out_dir = Path(args.out_dir)
    metadata_dir = Path(args.metadata_dir)

    prompts_overview = [
        {
            "id": shot.id,
            "source_file": str(shot.source_file),
            "model": shot.model or args.model,
            "prompt_string": shot.prompt_string,
        }
        for shot in shots
    ]
    write_json(out_dir / "prompts.json", prompts_overview)
    print(f"[info] Loaded {len(shots)} shot(s). Prompt overview: {out_dir / 'prompts.json'}")

    if args.dry_run:
        for shot in shots:
            print(f"\n--- {shot.id} ({shot.source_file.name}) ---")
            print(shot.prompt_string)
        return 0

    try:
        provider = build_provider(args)
    except Exception as exc:
        print(f"[error] Provider setup failed: {exc}", file=sys.stderr)
        return 1

    run_log: list[dict[str, Any]] = []

    for shot in shots:
        print(f"[info] Generating {shot.id} ...")
        entry: dict[str, Any] = {
            "id": shot.id,
            "source_file": str(shot.source_file),
            "ok": False,
            "files": [],
            "metadata_file": None,
            "error": None,
            "result": None,
        }

        try:
            result = provider.generate(shot=shot, prompt=shot.prompt_string, default_extra_args=default_extra_args)
            entry["result"] = result

            media_items = extract_media_strings(result)
            if not media_items:
                raise RuntimeError("Provider returned no detectable video URL/path")

            saved_files: list[str] = []

            shot_out_dir = resolve_output_dir(out_dir, shot.id)

            for idx, media in enumerate(media_items, start=1):
                suffix = extension_from_media(media)
                base_name = shot.id if idx == 1 else f"{shot.id}_{idx:02d}"
                video_path = shot_out_dir / f"{base_name}{suffix}"
                save_media_file(media=media, dest=video_path)
                saved_files.append(str(video_path))

            validate_extended_knowledge_schema(shot.knowledge)
            metadata_path = metadata_dir / f"{shot.id}.json"
            write_json(metadata_path, shot.knowledge)

            entry["files"] = saved_files
            entry["metadata_file"] = str(metadata_path)
            entry["ok"] = True
            print(f"[ok] {shot.id} -> {', '.join(saved_files)} | metadata: {metadata_path}")

        except Exception as exc:
            entry["error"] = str(exc)
            print(f"[error] {shot.id} failed: {exc}", file=sys.stderr)

        run_log.append(entry)

        if args.sleep > 0:
            time.sleep(args.sleep)

    write_json(out_dir / "run_log.json", run_log)
    print(f"[info] Run log written to {out_dir / 'run_log.json'}")

    failures = sum(1 for item in run_log if not item["ok"])
    if failures:
        print(f"[done] Completed with {failures} failed shot(s).", file=sys.stderr)
        return 2

    print("[done] All shots processed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
