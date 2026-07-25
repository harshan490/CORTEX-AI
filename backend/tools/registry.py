import importlib
import inspect
import logging
from typing import Any, Callable, Dict, List, Optional, Type

from config import settings

logger = logging.getLogger("cortex.tools.registry")

_TOOL_MODULES: Dict[str, str] = {
    "gmail": "tools.gmail",
    "calendar": "tools.calendar",
    "slack": "tools.slack",
    "jira": "tools.jira",
    "notion": "tools.notion",
    "github": "tools.github",
}

_TOOL_CLASSES: Dict[str, str] = {
    "gmail": "GmailTool",
    "calendar": "CalendarTool",
    "slack": "SlackTool",
    "jira": "JiraTool",
    "notion": "NotionTool",
    "github": "GitHubTool",
}


class ToolRegistry:
    def __init__(self, mock_mode: bool = True):
        self.mock_mode = mock_mode
        self._tools: Dict[str, Any] = {}
        self._tool_config: Dict[str, bool] = {}
        self._load_config()

    def _load_config(self):
        enabled_env = getattr(settings, "ENABLED_TOOLS", None)
        if enabled_env:
            try:
                if isinstance(enabled_env, str):
                    tools_list = [t.strip().lower() for t in enabled_env.split(",")]
                    self._tool_config = {t: True for t in tools_list}
                    for t in _TOOL_MODULES:
                        self._tool_config.setdefault(t, False)
                    return
            except Exception:
                pass

        default_enabled = {"gmail", "calendar", "slack", "jira", "notion", "github"}
        self._tool_config = {t: True for t in default_enabled}

    def get_tool(self, name: str) -> Any:
        name = name.lower()
        if name in self._tools:
            return self._tools[name]

        if name not in _TOOL_MODULES:
            raise ValueError(
                f"Unknown tool: '{name}'. "
                f"Available tools: {list(_TOOL_MODULES.keys())}"
            )

        module_path = _TOOL_MODULES[name]
        class_name = _TOOL_CLASSES[name]

        try:
            module = importlib.import_module(module_path)
            tool_class = getattr(module, class_name)
            instance = tool_class(mock_mode=self.mock_mode)
            self._tools[name] = instance
            logger.info(f"Loaded tool: {name} ({class_name})")
            return instance
        except (ImportError, AttributeError) as e:
            logger.error(f"Failed to load tool {name}: {e}")
            raise RuntimeError(f"Tool '{name}' could not be loaded: {e}")

    def get_available_tools(self) -> List[str]:
        available = []
        for name in _TOOL_MODULES:
            if self._tool_config.get(name, True):
                try:
                    self.get_tool(name)
                    available.append(name)
                except (ImportError, RuntimeError):
                    available.append(f"{name} (unavailable)")
                    continue
        return available

    async def execute_tool(self, tool_name: str, method: str, params: Dict) -> Any:
        tool_name = tool_name.lower()
        tool = self.get_tool(tool_name)

        if not hasattr(tool, method):
            raise AttributeError(
                f"Tool '{tool_name}' has no method '{method}'. "
                f"Available methods: {self._get_methods(tool)}"
            )

        method_fn = getattr(tool, method)
        if not callable(method_fn):
            raise TypeError(f"'{method}' on tool '{tool_name}' is not callable")

        logger.info(f"Executing {tool_name}.{method} with params: {params}")
        try:
            if inspect.iscoroutinefunction(method_fn):
                result = await method_fn(**params)
            else:
                result = method_fn(**params)
            return result
        except Exception as e:
            logger.error(f"Error executing {tool_name}.{method}: {e}")
            raise

    def is_tool_available(self, name: str) -> bool:
        name = name.lower()
        if name not in _TOOL_MODULES:
            return False
        if not self._tool_config.get(name, True):
            return False
        try:
            self.get_tool(name)
            return True
        except (ImportError, RuntimeError):
            return False

    def enable_tool(self, name: str):
        name = name.lower()
        if name in _TOOL_MODULES:
            self._tool_config[name] = True
            if name in self._tools:
                del self._tools[name]
            logger.info(f"Enabled tool: {name}")

    def disable_tool(self, name: str):
        name = name.lower()
        self._tool_config[name] = False
        self._tools.pop(name, None)
        logger.info(f"Disabled tool: {name}")

    def _get_methods(self, tool: Any) -> List[str]:
        return [
            name for name in dir(tool)
            if not name.startswith("_")
            and callable(getattr(tool, name))
        ]


_registry_instance: Optional[ToolRegistry] = None


def get_tool_registry(mock_mode: bool = True) -> ToolRegistry:
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = ToolRegistry(mock_mode=mock_mode)
    return _registry_instance


def reset_tool_registry():
    global _registry_instance
    _registry_instance = None
