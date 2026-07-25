import asyncio
import functools
import hashlib
import logging
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Callable, Dict, List, Optional, TypeVar, Union

logger = logging.getLogger("cortex.utils.helpers")

T = TypeVar("T")


def generate_uuid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.now(timezone.utc)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")


def truncate_text(text: str, max_length: int = 200) -> str:
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."


def parse_duration(duration_str: str) -> int:
    total_seconds = 0
    pattern = re.compile(r"(?:(\d+)\s*h(?:ours?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?\s*(?:(\d+)\s*s(?:ec(?:onds?)?)?)?", re.IGNORECASE)
    match = pattern.match(duration_str.strip())
    if not match:
        raise ValueError(f"Invalid duration string: {duration_str}")
    hours = int(match.group(1)) if match.group(1) else 0
    minutes = int(match.group(2)) if match.group(2) else 0
    seconds = int(match.group(3)) if match.group(3) else 0
    return hours * 3600 + minutes * 60 + seconds


def format_duration(seconds: int) -> str:
    if seconds < 0:
        seconds = 0
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    parts = []
    if hours > 0:
        parts.append(f"{hours}h")
    if minutes > 0:
        parts.append(f"{minutes}m")
    if secs > 0 or not parts:
        parts.append(f"{secs}s")
    return " ".join(parts)


def parse_datetime(text: str) -> Optional[datetime]:
    text = text.strip().lower()
    now_dt = now()

    if text in ("now", "today"):
        return now_dt

    if text == "tomorrow":
        return now_dt.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(days=1)

    if text == "end of day":
        return now_dt.replace(hour=23, minute=59, second=59, microsecond=0)

    if text == "end of week":
        days_until_friday = (4 - now_dt.weekday()) % 7
        return (now_dt + timedelta(days=days_until_friday)).replace(hour=17, minute=0, second=0, microsecond=0)

    rel_match = re.match(r"in (\d+) (minute|minutes|hour|hours|day|days|week|weeks)", text)
    if rel_match:
        count = int(rel_match.group(1))
        unit = rel_match.group(2)
        if unit.startswith("minute"):
            return now_dt + timedelta(minutes=count)
        if unit.startswith("hour"):
            return now_dt + timedelta(hours=count)
        if unit.startswith("day"):
            return now_dt + timedelta(days=count)
        if unit.startswith("week"):
            return now_dt + timedelta(weeks=count)

    iso_formats = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y",
    ]
    for fmt in iso_formats:
        try:
            return datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    return None


def calculate_priority(deadline: Optional[datetime], importance: Optional[float] = None) -> str:
    if deadline is None and importance is None:
        return "medium"

    now_dt = now()
    urgency_score = 0

    if deadline:
        hours_remaining = (deadline - now_dt).total_seconds() / 3600
        if hours_remaining <= 4:
            urgency_score = 1.0
        elif hours_remaining <= 24:
            urgency_score = 0.8
        elif hours_remaining <= 72:
            urgency_score = 0.5
        elif hours_remaining <= 168:
            urgency_score = 0.3
        else:
            urgency_score = 0.1
    else:
        urgency_score = 0.2

    if importance is not None:
        importance = max(0.0, min(1.0, importance))
    else:
        importance = 0.5

    combined = urgency_score * 0.6 + importance * 0.4

    if combined >= 0.8:
        return "critical"
    if combined >= 0.6:
        return "high"
    if combined >= 0.3:
        return "medium"
    return "low"


def deep_merge(dict1: Dict, dict2: Dict, overwrite: bool = True) -> Dict:
    result = dict1.copy()
    for key, value in dict2.items():
        if key in result:
            if isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = deep_merge(result[key], value, overwrite)
            elif overwrite:
                result[key] = value
        else:
            result[key] = value
    return result


def chunk_list(lst: List[T], chunk_size: int) -> List[List[T]]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    return [lst[i : i + chunk_size] for i in range(0, len(lst), chunk_size)]


def retry_async(max_retries: int = 3, delay: float = 1.0, backoff: float = 2.0, exceptions: tuple = (Exception,)):
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception = None
            current_delay = delay
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries:
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_retries + 1} failed for "
                            f"{func.__name__}: {e}. Retrying in {current_delay}s..."
                        )
                        await asyncio.sleep(current_delay)
                        current_delay *= backoff
                    else:
                        logger.error(
                            f"All {max_retries + 1} attempts failed for {func.__name__}: {e}"
                        )
            raise last_exception

        return wrapper

    return decorator
