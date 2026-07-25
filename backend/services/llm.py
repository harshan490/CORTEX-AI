import hashlib
import json
import logging
import time
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("cortex.services.llm")

ANALYSIS_TEMPLATES = {
    "summary": {
        "prompt": "Summarize the following meeting transcript concisely, covering key topics, decisions, and action items:\n\n{transcript}",
        "response_template": {
            "summary": "Team discussed sprint priorities including API integration, dashboard redesign, and performance optimization. Key decision was to prioritize auth fixes. Action items assigned to team members.",
            "key_points": [
                "Auth fixes prioritized as highest urgency",
                "API integration documentation ready for review",
                "Dashboard redesign to start after auth stabilizes",
                "Friday checkpoint scheduled for progress review",
            ],
            "duration_minutes": 30,
        },
    },
    "action_items": {
        "prompt": "Extract all action items, owners, and deadlines from this transcript:\n\n{transcript}",
        "response_template": {
            "action_items": [
                {"task": "Fix authentication module login issues", "assignee": "Carol Williams", "deadline": None, "priority": "high"},
                {"task": "Share API integration documentation in team channel", "assignee": "Bob Smith", "deadline": None, "priority": "medium"},
                {"task": "Coordinate with QA for load testing support", "assignee": "Alice Johnson", "deadline": None, "priority": "medium"},
                {"task": "Set up shared dependency tracker across teams", "assignee": "Bob Smith", "deadline": None, "priority": "low"},
            ],
        },
    },
    "decisions": {
        "prompt": "Identify all decisions made during this meeting:\n\n{transcript}",
        "response_template": {
            "decisions": [
                {"decision": "Auth fixes will be the top priority", "made_by": "Alice Johnson", "rationale": "User reports indicate critical login issues", "confidence": 0.95},
                {"decision": "API integration deadline set for next Wednesday", "made_by": "Alice Johnson", "rationale": "Timeline agreed by all stakeholders", "confidence": 0.90},
                {"decision": "Dashboard redesign to begin after auth fixes are stable", "made_by": "Alice Johnson", "rationale": "Dependency management to avoid bottlenecks", "confidence": 0.88},
                {"decision": "Friday checkpoint meeting to review progress", "made_by": "Alice Johnson", "rationale": "Ensure all teams are aligned", "confidence": 0.92},
            ],
        },
    },
    "sentiment": {
        "prompt": "Analyze the sentiment and tone of this meeting transcript:\n\n{transcript}",
        "response_template": {
            "overall_sentiment": "positive",
            "sentiment_score": 0.78,
            "key_moments": [
                {"timestamp": 0.0, "sentiment": "neutral", "text": "Meeting opened with standard greeting"},
                {"timestamp": 28.2, "sentiment": "positive", "text": "Team showed willingness to prioritize critical issues"},
                {"timestamp": 88.8, "sentiment": "positive", "text": "Meeting closed on an optimistic and collaborative note"},
            ],
            "team_morale": "high",
            "engagement_level": "high",
        },
    },
    "risks": {
        "prompt": "Identify potential risks, blockers, and concerns from this transcript:\n\n{transcript}",
        "response_template": {
            "risks": [
                {"risk": "Authentication issues could escalate if not resolved quickly", "severity": "high", "likelihood": 0.7, "mitigation": "Dedicated three-day fix sprint"},
                {"risk": "Dashboard redesign may be delayed if auth fixes overrun", "severity": "medium", "likelihood": 0.5, "mitigation": "Start dashboard work in parallel where possible"},
                {"risk": "Load testing infrastructure may not be ready", "severity": "medium", "likelihood": 0.4, "mitigation": "QA team has been informed and will prepare"},
            ],
        },
    },
}

SUMMARIZATION_STYLES = {
    "concise": "Summarize in 2-3 sentences covering only the most critical information.",
    "detailed": "Provide a comprehensive summary covering all topics, decisions, and action items with context.",
    "bullet": "Provide a bullet-point summary with key takeaways, decisions, and next steps.",
    "executive": "Provide an executive summary focused on business impact, strategic decisions, and high-level outcomes.",
}

MOCK_CHAT_RESPONSES = {
    "default": "I understand your request. Based on the context provided, here is my analysis and response.",
    "greeting": "Hello! I'm CORTEX AI, your autonomous chief of staff. How can I assist you today?",
}

CACHE_TTL_SECONDS = 3600


class LLMService:
    def __init__(
        self,
        provider: str = "openai",
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        mock_mode: bool = True,
    ):
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model or self._get_default_model()
        self.mock_mode = mock_mode
        self._cache: Dict[str, tuple[float, Any]] = {}

    def _get_default_model(self) -> str:
        models = {
            "openai": "gpt-4",
            "gemini": "gemini-pro",
            "nvidia": "nvidia/nemotron-4-340b-instruct",
        }
        return models.get(self.provider, "gpt-4")

    def _cache_key(self, *args, **kwargs) -> str:
        raw = json.dumps({"args": args, "kwargs": kwargs}, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode()).hexdigest()

    def _get_from_cache(self, key: str) -> Optional[Any]:
        entry = self._cache.get(key)
        if entry and (time.time() - entry[0]) < CACHE_TTL_SECONDS:
            logger.debug(f"Cache hit for key {key[:16]}...")
            return entry[1]
        if entry:
            del self._cache[key]
        return None

    def _set_cache(self, key: str, value: Any):
        self._cache[key] = (time.time(), value)
        if len(self._cache) > 1000:
            cutoff = time.time() - CACHE_TTL_SECONDS
            self._cache = {k: v for k, v in self._cache.items() if v[0] > cutoff}

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> str:
        cache_key = self._cache_key("chat", messages, model, temperature, max_tokens)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        logger.info(f"LLM chat call ({self.provider}/{model or self.model})")

        if self.mock_mode:
            import asyncio
            await asyncio.sleep(0.05)
            last_msg = messages[-1]["content"].lower() if messages else ""
            for keyword in MOCK_CHAT_RESPONSES:
                if keyword != "default" and keyword in last_msg:
                    response = MOCK_CHAT_RESPONSES[keyword]
                    break
            else:
                response = MOCK_CHAT_RESPONSES["default"]
            response = self._generate_mock_chat_response(messages)
            self._set_cache(cache_key, response)
            return response

        response = await self._call_provider(messages, model or self.model, temperature, max_tokens)
        self._set_cache(cache_key, response)
        return response

    def _generate_mock_chat_response(self, messages: List[Dict[str, str]]) -> str:
        system_msg = next((m["content"] for m in messages if m["role"] == "system"), "")
        user_msg = next((m["content"] for m in messages if m["role"] == "user"), "")

        if "summarize" in (user_msg + system_msg).lower():
            return (
                "Based on the transcript provided, here is a concise summary:\n\n"
                "The team held a sprint planning meeting where they identified key priorities including API integration, "
                "dashboard redesign, and critical auth fixes. Alice Johnson led the discussion, with Bob Smith and Carol Williams "
                "contributing updates. The main decision was to prioritize authentication fixes due to user reports. "
                "A Friday checkpoint was scheduled for progress review. Action items were assigned to all team members."
            )
        if "extract" in (user_msg + system_msg).lower() or "json" in (user_msg + system_msg).lower():
            return json.dumps({
                "items": [
                    {"type": "action_item", "description": "Fix auth login issues", "assignee": "Carol Williams"},
                    {"type": "action_item", "description": "Share API docs", "assignee": "Bob Smith"},
                    {"type": "decision", "description": "Prioritize auth fixes", "made_by": "Alice Johnson"},
                ]
            })
        if "questions" in (user_msg + system_msg).lower():
            return "1. What is the current status of the auth fixes?\n2. When will the API documentation be ready?\n3. Any blockers for the dashboard redesign?"
        return (
            "Thank you for your input. Based on my analysis, I recommend proceeding with the outlined plan. "
            "The key areas requiring attention are: (1) prioritizing critical bug fixes, (2) ensuring cross-team "
            "communication on dependencies, and (3) setting up regular checkpoints to track progress."
        )

    async def _call_provider(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int,
    ) -> str:
        if self.provider == "openai":
            return await self._call_openai(messages, model, temperature, max_tokens)
        if self.provider == "gemini":
            return await self._call_gemini(messages, model, temperature, max_tokens)
        if self.provider == "nvidia":
            return await self._call_nvidia(messages, model, temperature, max_tokens)
        raise ValueError(f"Unsupported provider: {self.provider}")

    async def _call_openai(self, messages, model, temperature, max_tokens) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key)
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise

    async def _call_gemini(self, messages, model, temperature, max_tokens) -> str:
        try:
            formatted = self._convert_to_gemini_format(messages)
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    params={"key": self.api_key},
                    json={
                        "contents": formatted,
                        "generationConfig": {
                            "temperature": temperature,
                            "maxOutputTokens": max_tokens,
                        },
                    },
                )
                response.raise_for_status()
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    return "".join(p.get("text", "") for p in parts)
                return ""
        except Exception as e:
            logger.error(f"Gemini API call failed: {e}")
            raise

    async def _call_nvidia(self, messages, model, temperature, max_tokens) -> str:
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"https://integrate.api.nvidia.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature,
                        "max_tokens": max_tokens,
                    },
                )
                response.raise_for_status()
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "")
                return ""
        except Exception as e:
            logger.error(f"NVIDIA NIM API call failed: {e}")
            raise

    def _convert_to_gemini_format(self, messages: List[Dict[str, str]]) -> List[Dict]:
        contents = []
        for msg in messages:
            role = msg["role"]
            if role == "system":
                contents.append({
                    "role": "user",
                    "parts": [{"text": f"System instruction: {msg['content']}"}],
                })
                contents.append({
                    "role": "model",
                    "parts": [{"text": "Understood. I will follow these instructions."}],
                })
            elif role == "user":
                contents.append({"role": "user", "parts": [{"text": msg["content"]}]})
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": msg["content"]}]})
        return contents

    async def analyze_transcript(self, transcript_data: Dict, analysis_type: str) -> Dict[str, Any]:
        template = ANALYSIS_TEMPLATES.get(analysis_type)
        if not template:
            raise ValueError(f"Unknown analysis type: {analysis_type}. Available: {list(ANALYSIS_TEMPLATES.keys())}")

        full_text = transcript_data.get("full_text", "")
        if not full_text:
            segments = transcript_data.get("segments", [])
            full_text = " ".join(s.get("text", "") for s in segments)

        logger.info(f"Analyzing transcript (type={analysis_type})")

        if self.mock_mode:
            return template["response_template"]

        prompt = template["prompt"].format(transcript=full_text)
        response_text = await self.chat(
            messages=[
                {"role": "system", "content": "You are an expert meeting analyst. Return structured JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=2048,
        )

        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            logger.warning("Failed to parse LLM response as JSON, returning raw text")
            return {"raw_analysis": response_text}

    async def extract_structured(self, transcript_data: Dict, schema: Dict) -> Dict[str, Any]:
        full_text = transcript_data.get("full_text", "")
        if not full_text:
            segments = transcript_data.get("segments", [])
            full_text = " ".join(s.get("text", "") for s in segments)

        logger.info(f"Structured extraction with schema: {json.dumps(schema, default=str)[:200]}")

        if self.mock_mode:
            result = {}
            fields = schema if isinstance(schema, dict) else {}
            for field_name, field_type in fields.items():
                if field_type == "list":
                    result[field_name] = [{"sample": f"extracted_{field_name}_1"}]
                elif field_type == "dict":
                    result[field_name] = {"key": "value"}
                elif field_type in ("str", "string"):
                    result[field_name] = f"extracted_{field_name}"
                elif field_type in ("int", "integer", "float", "number"):
                    result[field_name] = 0
                else:
                    result[field_name] = None
            return result

        prompt = (
            f"Extract structured information from the following transcript according to this schema:\n"
            f"{json.dumps(schema, indent=2)}\n\nTranscript:\n{full_text}\n\n"
            f"Return valid JSON matching the schema exactly."
        )
        response_text = await self.chat(
            messages=[
                {"role": "system", "content": "You are a structured data extraction system. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            max_tokens=2048,
        )

        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            logger.warning("Failed to parse extraction as JSON")
            return {"error": "parse_failed", "raw": response_text}

    async def generate_embedding(self, text: str) -> List[float]:
        cache_key = self._cache_key("embedding", text)
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        logger.info(f"Generating embedding ({len(text)} chars)")

        if self.mock_mode:
            import asyncio
            await asyncio.sleep(0.02)
            dim = 384
            import hashlib
            seed = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
            import random
            rng = random.Random(seed)
            vector = [rng.random() * 2 - 1 for _ in range(dim)]
            magnitude = sum(v * v for v in vector) ** 0.5
            vector = [v / magnitude for v in vector]
            self._set_cache(cache_key, vector)
            return vector

        try:
            from sentence_transformers import SentenceTransformer
            model = SentenceTransformer("BAAI/bge-base-en-v1.5")
            embedding = model.encode(text, normalize_embeddings=True).tolist()
            self._set_cache(cache_key, embedding)
            return embedding
        except ImportError:
            logger.warning("sentence-transformers not installed, falling back to mock embedding")
            dim = 384
            seed = int(hashlib.md5(text.encode()).hexdigest()[:8], 16)
            rng = random.Random(seed)
            vector = [rng.random() * 2 - 1 for _ in range(dim)]
            magnitude = sum(v * v for v in vector) ** 0.5
            vector = [v / magnitude for v in vector]
            self._set_cache(cache_key, vector)
            return vector

    async def summarize(self, transcript_data: Dict, style: str = "concise") -> str:
        style_prompt = SUMMARIZATION_STYLES.get(style, SUMMARIZATION_STYLES["concise"])
        full_text = transcript_data.get("full_text", "")
        if not full_text:
            segments = transcript_data.get("segments", [])
            full_text = " ".join(s.get("text", "") for s in segments)

        logger.info(f"Summarizing transcript (style={style})")

        if self.mock_mode:
            import asyncio
            await asyncio.sleep(0.03)
            if style == "concise":
                return (
                    "Sprint planning meeting led by Alice Johnson. Team prioritized auth fixes over dashboard "
                    "redesign due to critical user issues. API integration documentation is ready. "
                    "Friday checkpoint scheduled. Action items assigned."
                )
            if style == "bullet":
                return (
                    "- Auth fixes prioritized (3 days + 1 day testing)\n"
                    "- API integration doc ready for review\n"
                    "- Dashboard redesign deferred until auth stable\n"
                    "- Friday checkpoint meeting scheduled\n"
                    "- QA team to prepare for load testing"
                )
            if style == "executive":
                return (
                    "Executive Summary: The sprint planning resulted in a strategic pivot to prioritize "
                    "authentication reliability, deferring dashboard redesign. This decision addresses "
                    "critical user-reported issues and aligns with quarterly stability goals. Cross-team "
                    "coordination mechanisms established via shared tracker and Friday checkpoints."
                )
            return (
                "The sprint planning meeting covered three main workstreams: authentication fixes, "
                "API integration, and dashboard redesign. The team agreed to prioritize auth fixes "
                "due to user-reported login issues. API integration documentation is ready for review "
                "with a target completion of next Wednesday. Dashboard redesign will commence after "
                "auth fixes are stabilized. A checkpoint meeting is scheduled for Friday to review progress."
            )

        prompt = f"{style_prompt}\n\nTranscript:\n{full_text}"
        return await self.chat(
            messages=[
                {"role": "system", "content": "You are an expert at summarizing meetings. Be concise and accurate."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.3,
            max_tokens=1024,
        )
