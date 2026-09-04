"""
In-memory store for pending write-action confirmations.

Each pending confirmation is keyed by a server-generated confirmation_id
(not just session_id) so that a single session could, in principle, have
more than one thing awaiting confirmation without collision, though the
Interface Layer is expected to only ever have one open confirmation dialog
at a time.
"""

import threading
import time
import uuid


class PendingConfirmationStore:
    def __init__(self, timeout_seconds=60):
        self._lock = threading.Lock()
        self._pending = {}  # confirmation_id -> record
        self.timeout_seconds = timeout_seconds

    def create(self, session_id, action_request, pre_state=None):
        confirmation_id = str(uuid.uuid4())
        record = {
            "confirmation_id": confirmation_id,
            "session_id": session_id,
            "action_request": action_request,
            "pre_state": pre_state,
            "created_at": time.time(),
        }
        with self._lock:
            self._pending[confirmation_id] = record
        return record

    def get(self, confirmation_id):
        """Returns (record, status) where status is one of:
        'ok', 'expired', 'not_found'. Does NOT remove the record — call
        pop() once you're done with it."""
        with self._lock:
            record = self._pending.get(confirmation_id)
        if record is None:
            return None, "not_found"
        if time.time() - record["created_at"] > self.timeout_seconds:
            return record, "expired"
        return record, "ok"

    def pop(self, confirmation_id):
        with self._lock:
            return self._pending.pop(confirmation_id, None)

    def sweep_expired(self):
        """Remove and return any records that have aged past the timeout
        without ever receiving a confirmation_response. Used by a
        background thread so timeouts get logged even if the Interface
        Layer never calls back at all."""
        expired = []
        now = time.time()
        with self._lock:
            for cid in list(self._pending.keys()):
                rec = self._pending[cid]
                if now - rec["created_at"] > self.timeout_seconds:
                    expired.append(self._pending.pop(cid))
        return expired
