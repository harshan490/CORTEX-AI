import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("cortex.tools.calendar")


class CalendarTool:
    def __init__(self, mock_mode: bool = True, credentials_path: Optional[str] = None):
        self.mock_mode = mock_mode
        self.credentials_path = credentials_path or os.path.expanduser("~/.credentials/calendar.json")
        self._service = None
        self._creds = None

    async def _authenticate(self):
        if self.mock_mode or self._service:
            return

        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build

        SCOPES = ["https://www.googleapis.com/auth/calendar"]

        if os.path.exists(self.credentials_path):
            self._creds = Credentials.from_authorized_user_file(self.credentials_path, SCOPES)

        if not self._creds or not self._creds.valid:
            if self._creds and self._creds.expired and self._creds.refresh_token:
                self._creds.refresh(Request())
            else:
                client_secret = os.path.expanduser("~/.credentials/calendar_client_secret.json")
                if not os.path.exists(client_secret):
                    logger.warning("Calendar client secret not found, falling back to mock mode")
                    self.mock_mode = True
                    return
                flow = InstalledAppFlow.from_client_secrets_file(client_secret, SCOPES)
                self._creds = flow.run_local_server(port=0)

            os.makedirs(os.path.dirname(self.credentials_path), exist_ok=True)
            with open(self.credentials_path, "w") as token:
                token.write(self._creds.to_json())

        self._service = build("calendar", "v3", credentials=self._creds)

    def _format_datetime(self, dt: Any) -> Dict[str, str]:
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        if isinstance(dt, datetime):
            return {"dateTime": dt.isoformat(), "timeZone": "UTC"}
        return {"dateTime": str(dt), "timeZone": "UTC"}

    async def create_event(
        self,
        summary: str,
        description: str = "",
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        attendees: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        if start_time is None:
            start_time = datetime.now(timezone.utc)
        if end_time is None:
            end_time = start_time + timedelta(hours=1)

        logger.info(f"Creating calendar event: {summary}")

        if self.mock_mode:
            return {
                "id": str(uuid.uuid4()),
                "summary": summary,
                "description": description,
                "start": self._format_datetime(start_time),
                "end": self._format_datetime(end_time),
                "attendees": [{"email": a} for a in (attendees or [])],
                "html_link": f"https://calendar.google.com/calendar/event?eid=mock_{uuid.uuid4().hex[:12]}",
                "status": "confirmed",
                "created": datetime.now(timezone.utc).isoformat(),
            }

        await self._authenticate()
        event_body = {
            "summary": summary,
            "description": description,
            "start": self._format_datetime(start_time),
            "end": self._format_datetime(end_time),
        }
        if attendees:
            event_body["attendees"] = [{"email": email} for email in attendees]

        event = self._service.events().insert(calendarId="primary", body=event_body).execute()
        return {
            "id": event.get("id"),
            "summary": event.get("summary"),
            "description": event.get("description"),
            "start": event.get("start"),
            "end": event.get("end"),
            "attendees": event.get("attendees", []),
            "html_link": event.get("htmlLink"),
            "status": event.get("status"),
            "created": event.get("created"),
        }

    async def update_event(self, event_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        logger.info(f"Updating calendar event: {event_id}")

        if self.mock_mode:
            return {
                "id": event_id,
                "summary": updates.get("summary", "Updated Event"),
                "status": "updated",
                "updated": datetime.now(timezone.utc).isoformat(),
            }

        await self._authenticate()
        event_body = {}
        if "summary" in updates:
            event_body["summary"] = updates["summary"]
        if "description" in updates:
            event_body["description"] = updates["description"]
        if "start_time" in updates:
            event_body["start"] = self._format_datetime(updates["start_time"])
        if "end_time" in updates:
            event_body["end"] = self._format_datetime(updates["end_time"])
        if "attendees" in updates:
            event_body["attendees"] = [{"email": e} for e in updates["attendees"]]

        event = self._service.events().patch(calendarId="primary", eventId=event_id, body=event_body).execute()
        return {
            "id": event.get("id"),
            "summary": event.get("summary"),
            "status": "updated",
            "updated": event.get("updated"),
        }

    async def delete_event(self, event_id: str) -> Dict[str, Any]:
        logger.info(f"Deleting calendar event: {event_id}")

        if self.mock_mode:
            return {
                "id": event_id,
                "status": "deleted",
            }

        await self._authenticate()
        self._service.events().delete(calendarId="primary", eventId=event_id).execute()
        return {"id": event_id, "status": "deleted"}

    async def get_events(
        self,
        time_min: Optional[datetime] = None,
        time_max: Optional[datetime] = None,
        max_results: int = 50,
    ) -> List[Dict[str, Any]]:
        if time_min is None:
            time_min = datetime.now(timezone.utc)
        if time_max is None:
            time_max = time_min + timedelta(days=7)

        logger.info(f"Fetching calendar events from {time_min.isoformat()} to {time_max.isoformat()}")

        if self.mock_mode:
            return [
                {
                    "id": "mock_event_001",
                    "summary": "Sprint Planning",
                    "description": "Weekly sprint planning meeting",
                    "start": {"dateTime": (time_min + timedelta(hours=2)).isoformat(), "timeZone": "UTC"},
                    "end": {"dateTime": (time_min + timedelta(hours=3)).isoformat(), "timeZone": "UTC"},
                    "attendees": [{"email": "alice@example.com"}, {"email": "bob@example.com"}],
                    "status": "confirmed",
                },
                {
                    "id": "mock_event_002",
                    "summary": "API Review",
                    "description": "Review API integration progress",
                    "start": {"dateTime": (time_min + timedelta(days=1, hours=4)).isoformat(), "timeZone": "UTC"},
                    "end": {"dateTime": (time_min + timedelta(days=1, hours=5)).isoformat(), "timeZone": "UTC"},
                    "attendees": [{"email": "bob@example.com"}],
                    "status": "confirmed",
                },
            ]

        await self._authenticate()
        events_result = self._service.events().list(
            calendarId="primary",
            timeMin=time_min.isoformat(),
            timeMax=time_max.isoformat(),
            maxResults=max_results,
            singleEvents=True,
            orderBy="startTime",
        ).execute()

        events = []
        for event in events_result.get("items", []):
            events.append({
                "id": event.get("id"),
                "summary": event.get("summary", ""),
                "description": event.get("description", ""),
                "start": event.get("start", {}),
                "end": event.get("end", {}),
                "attendees": event.get("attendees", []),
                "status": event.get("status", ""),
                "html_link": event.get("htmlLink"),
            })
        return events

    async def find_free_slots(
        self,
        participants: List[str],
        duration_minutes: int = 30,
        date_range: Optional[tuple[datetime, datetime]] = None,
    ) -> List[Dict[str, Any]]:
        if date_range is None:
            now = datetime.now(timezone.utc)
            date_range = (now, now + timedelta(days=7))

        start, end = date_range
        logger.info(f"Finding free slots for {len(participants)} participants, {duration_minutes}min")

        if self.mock_mode:
            slots = []
            current = start.replace(hour=9, minute=0, second=0, microsecond=0)
            if current < start:
                current += timedelta(days=1)
            while current < end and len(slots) < 10:
                if current.weekday() < 5 and 9 <= current.hour < 17:
                    slots.append({
                        "start": current.isoformat(),
                        "end": (current + timedelta(minutes=duration_minutes)).isoformat(),
                        "duration_minutes": duration_minutes,
                        "participants_available": len(participants),
                    })
                current += timedelta(minutes=30)
                if current.hour >= 17:
                    current = current.replace(hour=9) + timedelta(days=1)
            return slots

        await self._authenticate()
        freebusy_body = {
            "timeMin": start.isoformat(),
            "timeMax": end.isoformat(),
            "items": [{"id": email} for email in participants],
        }
        response = self._service.freebusy().query(body=freebusy_body).execute()
        calendars = response.get("calendars", {})
        busy_intervals = []
        for email, cal_data in calendars.items():
            for busy in cal_data.get("busy", []):
                busy_intervals.append({
                    "start": datetime.fromisoformat(busy["start"].replace("Z", "+00:00")),
                    "end": datetime.fromisoformat(busy["end"].replace("Z", "+00:00")),
                })

        busy_intervals.sort(key=lambda x: x["start"])
        merged = []
        for interval in busy_intervals:
            if merged and merged[-1]["end"] >= interval["start"]:
                merged[-1]["end"] = max(merged[-1]["end"], interval["end"])
            else:
                merged.append(interval)

        free_slots = []
        cursor = start
        duration = timedelta(minutes=duration_minutes)
        while cursor + duration <= end:
            slot_end = cursor + duration
            is_free = all(
                not (b["start"] < slot_end and b["end"] > cursor)
                for b in merged
            )
            if is_free:
                free_slots.append({
                    "start": cursor.isoformat(),
                    "end": slot_end.isoformat(),
                    "duration_minutes": duration_minutes,
                    "participants_available": len(participants),
                })
            cursor += timedelta(minutes=15)

        return free_slots
