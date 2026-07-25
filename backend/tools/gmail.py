import base64
import json
import logging
import os
import uuid
from email.message import EmailMessage
from typing import Any, Dict, List, Optional

from config import settings

logger = logging.getLogger("cortex.tools.gmail")

MOCK_EMAILS = [
    {
        "id": "mock_001",
        "thread_id": "thread_001",
        "from": "alice@example.com",
        "to": ["user@example.com"],
        "subject": "Sprint Planning Meeting Notes",
        "body": "Here are the notes from today's sprint planning meeting...",
        "received_at": "2026-07-25T10:30:00Z",
        "labels": ["INBOX", "IMPORTANT"],
        "has_attachments": True,
    },
    {
        "id": "mock_002",
        "thread_id": "thread_002",
        "from": "bob@example.com",
        "to": ["user@example.com"],
        "subject": "API Integration Status Update",
        "body": "The API integration is progressing well. Documentation is ready for review.",
        "received_at": "2026-07-24T15:45:00Z",
        "labels": ["INBOX"],
        "has_attachments": False,
    },
]


class GmailTool:
    def __init__(self, mock_mode: bool = True, credentials_path: Optional[str] = None):
        self.mock_mode = mock_mode
        self.credentials_path = credentials_path or os.path.expanduser("~/.credentials/gmail.json")
        self._service = None
        self._creds = None

    async def _authenticate(self):
        if self.mock_mode:
            return
        if self._service:
            return

        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build

        SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

        if os.path.exists(self.credentials_path):
            self._creds = Credentials.from_authorized_user_file(self.credentials_path, SCOPES)

        if not self._creds or not self._creds.valid:
            if self._creds and self._creds.expired and self._creds.refresh_token:
                self._creds.refresh(Request())
            else:
                client_secret = os.path.expanduser("~/.credentials/gmail_client_secret.json")
                if not os.path.exists(client_secret):
                    logger.warning("Gmail client secret not found, falling back to mock mode")
                    self.mock_mode = True
                    return
                flow = InstalledAppFlow.from_client_secrets_file(client_secret, SCOPES)
                self._creds = flow.run_local_server(port=0)

            os.makedirs(os.path.dirname(self.credentials_path), exist_ok=True)
            with open(self.credentials_path, "w") as token:
                token.write(self._creds.to_json())

        self._service = build("gmail", "v1", credentials=self._creds)

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Sending email to {to}: {subject}")

        if self.mock_mode:
            return {
                "id": str(uuid.uuid4()),
                "thread_id": str(uuid.uuid4()),
                "to": to,
                "subject": subject,
                "status": "sent",
                "sent_at": "2026-07-25T12:00:00Z",
            }

        await self._authenticate()
        msg = EmailMessage()
        msg["To"] = to
        msg["Subject"] = subject
        msg["From"] = "me"
        if cc:
            msg["Cc"] = ", ".join(cc)
        if bcc:
            msg["Bcc"] = ", ".join(bcc)
        msg.set_content(body)

        if attachments:
            for filepath in attachments:
                if os.path.exists(filepath):
                    with open(filepath, "rb") as f:
                        data = f.read()
                    maintype, subtype = self._guess_mime_type(filepath)
                    msg.add_attachment(data, maintype=maintype, subtype=subtype, filename=os.path.basename(filepath))

        encoded = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        sent = self._service.users().messages().send(userId="me", body={"raw": encoded}).execute()
        return {
            "id": sent.get("id"),
            "thread_id": sent.get("threadId"),
            "to": to,
            "subject": subject,
            "status": "sent",
            "sent_at": "2026-07-25T12:00:00Z",
        }

    def _guess_mime_type(self, filepath: str):
        ext = os.path.splitext(filepath)[1].lower()
        mime_map = {
            ".pdf": ("application", "pdf"),
            ".docx": ("application", "vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ".xlsx": ("application", "vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            ".png": ("image", "png"),
            ".jpg": ("image", "jpeg"),
            ".jpeg": ("image", "jpeg"),
            ".txt": ("text", "plain"),
        }
        return mime_map.get(ext, ("application", "octet-stream"))

    async def create_draft(self, to: str, subject: str, body: str) -> Dict[str, Any]:
        logger.info(f"Creating draft for {to}: {subject}")

        if self.mock_mode:
            return {
                "id": str(uuid.uuid4()),
                "to": to,
                "subject": subject,
                "status": "draft_created",
            }

        await self._authenticate()
        msg = EmailMessage()
        msg["To"] = to
        msg["Subject"] = subject
        msg["From"] = "me"
        msg.set_content(body)
        encoded = base64.urlsafe_b64encode(msg.as_bytes()).decode()
        draft = self._service.users().drafts().create(userId="me", body={"message": {"raw": encoded}}).execute()
        return {
            "id": draft.get("id"),
            "to": to,
            "subject": subject,
            "status": "draft_created",
        }

    async def get_emails(self, query: str = "", max_results: int = 20) -> List[Dict[str, Any]]:
        logger.info(f"Searching emails: {query}")

        if self.mock_mode:
            results = []
            for email in MOCK_EMAILS:
                if query.lower() in email["subject"].lower() or query.lower() in email["body"].lower():
                    results.append(email.copy())
            return results[:max_results]

        await self._authenticate()
        response = self._service.users().messages().list(
            userId="me", q=query, maxResults=max_results
        ).execute()
        messages = response.get("messages", [])
        results = []
        for msg in messages:
            detail = self._service.users().messages().get(
                userId="me", id=msg["id"], format="metadata"
            ).execute()
            headers = {h["name"]: h["value"] for h in detail.get("payload", {}).get("headers", [])}
            results.append({
                "id": detail["id"],
                "thread_id": detail.get("threadId"),
                "from": headers.get("From"),
                "to": headers.get("To"),
                "subject": headers.get("Subject"),
                "received_at": headers.get("Date"),
                "labels": detail.get("labelIds", []),
                "has_attachments": any(
                    p.get("filename") for p in detail.get("payload", {}).get("parts", [])
                ) if detail.get("payload") else False,
            })
        return results

    async def get_thread(self, thread_id: str) -> Dict[str, Any]:
        logger.info(f"Getting email thread: {thread_id}")

        if self.mock_mode:
            return {
                "id": thread_id,
                "messages": MOCK_EMAILS,
                "message_count": len(MOCK_EMAILS),
            }

        await self._authenticate()
        thread = self._service.users().threads().get(userId="me", id=thread_id).execute()
        messages = []
        for msg in thread.get("messages", []):
            headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
            payload = msg.get("payload", {})
            body = ""
            if "parts" in payload:
                for part in payload["parts"]:
                    if part.get("mimeType") == "text/plain" and part.get("body", {}).get("data"):
                        body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
                        break
            elif payload.get("body", {}).get("data"):
                body = base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")

            messages.append({
                "id": msg["id"],
                "from": headers.get("From"),
                "to": headers.get("To"),
                "subject": headers.get("Subject"),
                "body": body,
                "received_at": headers.get("Date"),
                "labels": msg.get("labelIds", []),
            })

        return {
            "id": thread_id,
            "messages": messages,
            "message_count": len(messages),
        }
