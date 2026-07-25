import json
import logging
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

logger = logging.getLogger("cortex.services.transcription")

MOCK_TRANSCRIPT = {
    "segments": [
        {"start": 0.0, "end": 4.2, "speaker": "Speaker 1", "text": "Good morning everyone, let's get started with the sprint planning meeting.", "confidence": 0.96},
        {"start": 4.3, "end": 8.7, "speaker": "Speaker 2", "text": "Good morning. I've gone through the backlog and identified the top priorities for this sprint.", "confidence": 0.94},
        {"start": 8.8, "end": 14.5, "speaker": "Speaker 1", "text": "Great, let's hear them. We need to focus on deliverables that align with the quarterly goals.", "confidence": 0.95},
        {"start": 14.6, "end": 22.3, "speaker": "Speaker 2", "text": "Absolutely. The main items are the API integration, the dashboard redesign, and the performance optimization work.", "confidence": 0.93},
        {"start": 22.4, "end": 28.1, "speaker": "Speaker 3", "text": "I want to add that the authentication module needs attention. We've had several user reports about login issues.", "confidence": 0.97},
        {"start": 28.2, "end": 35.0, "speaker": "Speaker 1", "text": "Noted. Let's prioritize the auth fixes then. Can you estimate the effort required?", "confidence": 0.95},
        {"start": 35.1, "end": 42.6, "speaker": "Speaker 3", "text": "I'd say about three days for the fixes and another day for testing. I can start on it right after this meeting.", "confidence": 0.94},
        {"start": 42.7, "end": 48.9, "speaker": "Speaker 2", "text": "For the API integration, I've already done some groundwork. The documentation is ready for review.", "confidence": 0.96},
        {"start": 49.0, "end": 55.2, "speaker": "Speaker 1", "text": "Excellent. Please share the doc link in our channel. Let's aim to complete the integration by next Wednesday.", "confidence": 0.93},
        {"start": 55.3, "end": 61.8, "speaker": "Speaker 2", "text": "That timeline works for me. I'll also need support from the QA team for load testing.", "confidence": 0.95},
        {"start": 61.9, "end": 68.4, "speaker": "Speaker 1", "text": "I'll coordinate with QA. Anyone have concerns about the dashboard redesign timeline?", "confidence": 0.94},
        {"start": 68.5, "end": 75.0, "speaker": "Speaker 3", "text": "The mockups are finalized. Development can start once the auth fixes are in a stable state.", "confidence": 0.96},
        {"start": 75.1, "end": 82.3, "speaker": "Speaker 1", "text": "Perfect. Let's set a checkpoint for Friday to review progress on all fronts. Action items are being logged.", "confidence": 0.97},
        {"start": 82.4, "end": 88.7, "speaker": "Speaker 2", "text": "Agreed. I'll also set up a shared tracker so we can monitor dependencies across teams.", "confidence": 0.95},
        {"start": 88.8, "end": 94.9, "speaker": "Speaker 1", "text": "Great meeting everyone. Let's make this sprint count. Same time next week for the review.", "confidence": 0.96},
    ],
    "speakers": [
        {"id": "Speaker 1", "name": "Alice Johnson"},
        {"id": "Speaker 2", "name": "Bob Smith"},
        {"id": "Speaker 3", "name": "Carol Williams"},
    ],
    "full_text": (
        "Good morning everyone, let's get started with the sprint planning meeting. "
        "Good morning. I've gone through the backlog and identified the top priorities for this sprint. "
        "Great, let's hear them. We need to focus on deliverables that align with the quarterly goals. "
        "Absolutely. The main items are the API integration, the dashboard redesign, and the performance optimization work. "
        "I want to add that the authentication module needs attention. We've had several user reports about login issues. "
        "Noted. Let's prioritize the auth fixes then. Can you estimate the effort required? "
        "I'd say about three days for the fixes and another day for testing. I can start on it right after this meeting. "
        "For the API integration, I've already done some groundwork. The documentation is ready for review. "
        "Excellent. Please share the doc link in our channel. Let's aim to complete the integration by next Wednesday. "
        "That timeline works for me. I'll also need support from the QA team for load testing. "
        "I'll coordinate with QA. Anyone have concerns about the dashboard redesign timeline? "
        "The mockups are finalized. Development can start once the auth fixes are in a stable state. "
        "Perfect. Let's set a checkpoint for Friday to review progress on all fronts. Action items are being logged. "
        "Agreed. I'll also set up a shared tracker so we can monitor dependencies across teams. "
        "Great meeting everyone. Let's make this sprint count. Same time next week for the review."
    ),
}


class TranscriptionService:
    def __init__(self, model_name: str = "base", mock_mode: bool = True):
        self.model_name = model_name
        self.mock_mode = mock_mode
        self._model = None

    async def _load_model(self):
        if self._model is None and not self.mock_mode:
            try:
                import whisper
                self._model = whisper.load_model(self.model_name)
                logger.info(f"Loaded whisper model: {self.model_name}")
            except ImportError:
                logger.warning("whisper not installed, falling back to mock mode")
                self.mock_mode = True

    async def transcribe_audio(self, file_path: str) -> Dict[str, Any]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Audio file not found: {file_path}")

        logger.info(f"Transcribing audio file: {file_path}")

        if self.mock_mode:
            await self._mock_processing_delay()
            result = {
                "segments": [s.copy() for s in MOCK_TRANSCRIPT["segments"]],
                "speakers": [s.copy() for s in MOCK_TRANSCRIPT["speakers"]],
                "full_text": MOCK_TRANSCRIPT["full_text"],
                "file_path": file_path,
                "duration_seconds": 95.0,
                "model": self.model_name,
                "language": "en",
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }
            logger.info(f"Transcription complete: {len(result['segments'])} segments")
            return result

        await self._load_model()
        import whisper
        result = whisper.transcribe(self._model, str(path))
        return {
            "segments": [
                {
                    "start": seg.get("start", 0),
                    "end": seg.get("end", 0),
                    "text": seg.get("text", "").strip(),
                    "confidence": seg.get("confidence", 1.0),
                    "speaker": None,
                }
                for seg in result.get("segments", [])
            ],
            "speakers": [],
            "full_text": result.get("text", "").strip(),
            "file_path": file_path,
            "duration_seconds": result.get("duration", 0),
            "model": self.model_name,
            "language": result.get("language", "en"),
            "processed_at": datetime.now(timezone.utc).isoformat(),
        }

    async def transcribe_from_url(self, url: str) -> Dict[str, Any]:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(f"Invalid URL: {url}")

        logger.info(f"Downloading and transcribing from URL: {url}")

        if self.mock_mode:
            await self._mock_processing_delay()
            result = {
                "segments": [s.copy() for s in MOCK_TRANSCRIPT["segments"]],
                "speakers": [s.copy() for s in MOCK_TRANSCRIPT["speakers"]],
                "full_text": MOCK_TRANSCRIPT["full_text"],
                "source_url": url,
                "duration_seconds": 95.0,
                "model": self.model_name,
                "language": "en",
                "processed_at": datetime.now(timezone.utc).isoformat(),
            }
            logger.info(f"URL transcription complete: {len(result['segments'])} segments")
            return result

        async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            suffix = Path(urlparse(url).path).suffix or ".mp3"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(response.content)
                tmp_path = tmp.name
        try:
            return await self.transcribe_audio(tmp_path)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

    async def diarize_speakers(self, transcript: Dict) -> Dict[str, Any]:
        logger.info("Running speaker diarization")
        segments = transcript.get("segments", [])
        if not segments:
            return transcript

        if self.mock_mode or all(s.get("speaker") is None for s in segments):
            current_speaker_id = "Speaker 1"
            speaker_assignments: List[Dict[str, str]] = []
            current_texts: List[str] = []

            for i, seg in enumerate(segments):
                next_start = segments[i + 1]["start"] if i + 1 < len(segments) else seg["end"] + 10
                gap = next_start - seg["end"]

                if gap > 1.5 and current_texts:
                    speaker_id = self._assign_next_speaker(speaker_assignments)
                    speaker_assignments.append({"speaker": speaker_id, "texts": current_texts.copy()})
                    current_texts = [seg["text"]]
                else:
                    if i == 0 or gap > 1.5:
                        current_texts = [seg["text"]]
                    else:
                        current_texts.append(seg["text"])

            if current_texts:
                speaker_id = self._assign_next_speaker(speaker_assignments)
                speaker_assignments.append({"speaker": speaker_id, "texts": current_texts})

            speaker_count = len(set(a["speaker"] for a in speaker_assignments))
            assignment_idx = 0
            for i, seg in enumerate(segments):
                if assignment_idx < len(speaker_assignments):
                    speakers_texts = speaker_assignments[assignment_idx]["texts"]
                    if current_texts and seg["text"] in speakers_texts:
                        seg["speaker"] = speaker_assignments[assignment_idx]["speaker"]
                    next_seg_text = segments[i + 1]["text"] if i + 1 < len(segments) else ""
                    if next_seg_text and next_seg_text not in speakers_texts and assignment_idx + 1 < len(speaker_assignments):
                        if next_seg_text in speaker_assignments[assignment_idx + 1].get("texts", []):
                            assignment_idx += 1
                else:
                    seg["speaker"] = speaker_assignments[-1]["speaker"]

        return transcript

    def _assign_next_speaker(self, existing: List[Dict]) -> str:
        used = {a["speaker"] for a in existing}
        for i in range(1, 10):
            sid = f"Speaker {i}"
            if sid not in used:
                return sid
        return f"Speaker {len(existing) + 1}"

    async def get_transcript_with_speakers(self, file_path: str) -> Dict[str, Any]:
        transcript = await self.transcribe_audio(file_path)
        transcript = await self.diarize_speakers(transcript)
        speaker_mapping: Dict[str, str] = {}
        seen_ids = set()
        for seg in transcript.get("segments", []):
            sid = seg.get("speaker")
            if sid and sid not in seen_ids:
                seen_ids.add(sid)
                speaker_mapping[sid] = sid

        known_speakers = transcript.get("speakers", [])
        known_names = {s["id"] for s in known_speakers}
        for sid in seen_ids:
            if sid not in known_names:
                known_speakers.append({"id": sid, "name": sid.replace("_", " ").title()})

        transcript["speakers"] = known_speakers
        transcript["full_text"] = " ".join(s["text"] for s in transcript.get("segments", []) if s.get("text"))
        return transcript

    async def _mock_processing_delay(self):
        import asyncio
        await asyncio.sleep(0.05)
