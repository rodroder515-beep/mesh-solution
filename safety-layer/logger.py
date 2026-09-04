"""
Append-only action log. One JSON object per line, so it can be tailed,
grepped, or loaded with a one-line-per-record parser later.

This is intentionally the only place in the Safety Layer that writes logs,
so every action — read or write, confirmed, cancelled, or timed out — goes
through the same code path and the same schema.
"""

import json
import os
import threading
from datetime import datetime, timezone


class ActionLogger:
    def __init__(self, log_path=None):
        self.log_path = log_path or os.environ.get(
            "SAFETY_LAYER_LOG_PATH", "safety_layer_actions.jsonl"
        )
        self._lock = threading.Lock()

    def log(self, **fields):
        entry = {
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }
        entry.update(fields)
        line = json.dumps(entry, ensure_ascii=False)
        with self._lock:
            with open(self.log_path, "a", encoding="utf-8") as f:
                f.write(line + "\n")
        return entry
