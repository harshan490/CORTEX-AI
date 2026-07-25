import json
import logging
import logging.config
import logging.handlers
import os
import sys
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from config import settings


class JSONLogFormatter(logging.Formatter):
    def __init__(self, include_stack: bool = False):
        super().__init__()
        self.include_stack = include_stack

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info and record.exc_info[0]:
            log_entry["exception"] = {
                "type": record.exc_info[0].__name__,
                "value": str(record.exc_info[1]),
                "traceback": "".join(traceback.format_exception(*record.exc_info))
                if self.include_stack
                else None,
            }

        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id

        if hasattr(record, "user_id"):
            log_entry["user_id"] = record.user_id

        extra_keys = getattr(record, "extra", None)
        if extra_keys:
            log_entry["extra"] = extra_keys

        return json.dumps(log_entry, default=str)


class ConsoleLogFormatter(logging.Formatter):
    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[35m",
    }
    RESET = "\033[0m"

    def __init__(self, use_colors: bool = True):
        super().__init__()
        self.use_colors = use_colors

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]
        level = record.levelname
        logger_name = record.name
        message = record.getMessage()

        if self.use_colors and sys.stderr.isatty():
            color = self.COLORS.get(level, "")
            level_padded = f"{color}{level:<8}{self.RESET}"
        else:
            level_padded = f"{level:<8}"

        location = f"{record.module}:{record.lineno}" if record.levelno >= logging.WARNING else record.module

        log_line = f"{timestamp} | {level_padded} | {logger_name:<30} | {location:<20} | {message}"

        if record.exc_info and record.exc_info[0]:
            log_line += "\n" + "".join(traceback.format_exception(*record.exc_info))

        return log_line


class AsyncQueueHandler(logging.handlers.QueueHandler):
    def __init__(self, queue: Optional[logging.handlers.QueueHandler] = None):
        import queue
        self._queue = queue or queue.Queue()
        super().__init__(self._queue)
        self._listener = logging.handlers.QueueListener(
            self._queue,
            *self._get_target_handlers(),
            respect_handler_level=True,
        )
        self._listener.start()

    def _get_target_handlers(self) -> list:
        targets = []
        log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.DEBUG)

        if settings.ENVIRONMENT == "production":
            json_handler = logging.StreamHandler(sys.stdout)
            json_handler.setLevel(log_level)
            json_handler.setFormatter(JSONLogFormatter(include_stack=True))
            targets.append(json_handler)

            error_handler = logging.StreamHandler(sys.stderr)
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(JSONLogFormatter(include_stack=True))
            targets.append(error_handler)
        else:
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(log_level)
            console_handler.setFormatter(ConsoleLogFormatter())
            targets.append(console_handler)

        if os.environ.get("CORTEX_LOG_FILE"):
            file_handler = logging.handlers.RotatingFileHandler(
                os.environ["CORTEX_LOG_FILE"],
                maxBytes=10 * 1024 * 1024,
                backupCount=5,
            )
            file_handler.setLevel(log_level)
            file_handler.setFormatter(JSONLogFormatter(include_stack=False))
            targets.append(file_handler)

        return targets


class RequestIDFilter(logging.Filter):
    def __init__(self):
        super().__init__()
        self._request_id = None

    @property
    def request_id(self) -> Optional[str]:
        return self._request_id

    @request_id.setter
    def request_id(self, value: Optional[str]):
        self._request_id = value

    def filter(self, record: logging.LogRecord) -> bool:
        if self._request_id:
            record.request_id = self._request_id
        return True


_request_id_filter = RequestIDFilter()


def get_request_id_filter() -> RequestIDFilter:
    return _request_id_filter


def setup_logging() -> None:
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.DEBUG)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    if settings.ENVIRONMENT == "production":
        json_handler = logging.StreamHandler(sys.stdout)
        json_handler.setLevel(log_level)
        json_handler.setFormatter(JSONLogFormatter(include_stack=True))
        root_logger.addHandler(json_handler)

        error_handler = logging.StreamHandler(sys.stderr)
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(JSONLogFormatter(include_stack=True))
        root_logger.addHandler(error_handler)
    else:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(log_level)
        console_handler.setFormatter(ConsoleLogFormatter())
        root_logger.addHandler(console_handler)

    root_logger.addFilter(_request_id_filter)

    third_party_loggers = [
        "httpx",
        "httpcore",
        "urllib3",
        "asyncio",
        "aiosqlite",
        "sqlalchemy.engine",
    ]

    if settings.ENVIRONMENT == "production":
        for name in third_party_loggers:
            logging.getLogger(name).setLevel(logging.WARNING)
            logging.getLogger(name).propagate = False
    else:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logging.getLogger("cortex").setLevel(log_level)

    num_handlers = len(root_logger.handlers)
    logger = logging.getLogger("cortex.init")
    logger.info(
        f"Logging configured: level={settings.LOG_LEVEL}, "
        f"environment={settings.ENVIRONMENT}, "
        f"handlers={num_handlers}"
    )


def get_logger(name: str, level: Optional[str] = None) -> logging.Logger:
    logger = logging.getLogger(name)
    if level:
        logger.setLevel(getattr(logging, level.upper(), logging.DEBUG))
    return logger
