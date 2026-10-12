import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.logging import logger
from app.database.session import get_session_factory
from app.monitoring.agent import collect_live_measurement
from app.schemas.measurement import MeasurementCreate
from app.services.measurement_service import record_measurement
from app.services.session_service import (
    get_active_session,
    update_active_session_with_measurement,
)


class NetworkCollectorDaemon:
    """
    Periodic background collector daemon for OrbitLink.
    Continuously samples device interface counters, network latency, and Wi-Fi status
    at configurable intervals, updating active sessions and persisting telemetry.
    """

    def __init__(self):
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()

        self.interval_seconds: int = settings.COLLECTOR_INTERVAL_SECONDS
        self.include_speed_test: bool = settings.COLLECTOR_INCLUDE_SPEED_TEST
        self.is_running: bool = False
        self.last_run: Optional[datetime] = None
        self.run_count: int = 0
        self.last_error: Optional[str] = None
        self.last_measurement_id: Optional[int] = None

    def start(self, interval_seconds: Optional[int] = None) -> None:
        """Starts the collector daemon in a dedicated background thread."""
        with self._lock:
            if self.is_running:
                logger.debug("Collector daemon is already running.")
                return

            if interval_seconds and interval_seconds > 0:
                self.interval_seconds = interval_seconds

            self._stop_event.clear()
            self.is_running = True

            self._thread = threading.Thread(
                target=self._loop,
                name="OrbitLink-CollectorDaemon",
                daemon=True,
            )
            self._thread.start()
            logger.info(
                f"OrbitLink background collector daemon started with polling interval = {self.interval_seconds}s"
            )

    def stop(self) -> None:
        """Stops the collector daemon gracefully."""
        with self._lock:
            if not self.is_running:
                return

            self._stop_event.set()
            self.is_running = False

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)

        logger.info("OrbitLink background collector daemon stopped.")

    def set_interval(self, interval_seconds: int) -> None:
        """Updates the polling interval dynamically."""
        if interval_seconds <= 0:
            raise ValueError("Interval must be a positive integer in seconds.")
        with self._lock:
            self.interval_seconds = interval_seconds
            logger.info(f"Collector polling interval updated to {interval_seconds}s")

    def get_status(self) -> Dict[str, Any]:
        """Returns the current operational status of the collector daemon."""
        with self._lock:
            return {
                "is_running": self.is_running,
                "interval_seconds": self.interval_seconds,
                "last_run": self.last_run,
                "run_count": self.run_count,
                "last_error": self.last_error,
                "last_measurement_id": self.last_measurement_id,
                "include_speed_test": self.include_speed_test,
            }

    def run_single_collection(self, db: Optional[Any] = None) -> Optional[int]:
        """
        Executes a single end-to-end collection step:
        1. Samples real device interface counters, latency, and Wi-Fi.
        2. Retrieves active network session (if any) and binds measurement to it.
        3. Persists record in database and updates session statistics.
        """
        managed = False
        try:
            live_data = collect_live_measurement(include_speed_test=self.include_speed_test)
            if db is None:
                session_factory = get_session_factory()
                db = session_factory()
                managed = True

            try:
                # Check for active session on this device
                active_session = get_active_session(db, live_data.get("device_id"))
                if active_session:
                    live_data["session_id"] = active_session.session_id

                # Save measurement
                measurement_in = MeasurementCreate(**live_data)
                saved_measurement = record_measurement(db, measurement_in)

                # If an active session exists, update its running aggregates
                if active_session:
                    # Query back the DB model object to update
                    from app.models.measurement import NetworkMeasurement
                    db_meas = db.get(NetworkMeasurement, saved_measurement.id)
                    if db_meas:
                        update_active_session_with_measurement(db, db_meas, active_session)

                with self._lock:
                    self.last_run = datetime.now(timezone.utc)
                    self.run_count += 1
                    self.last_measurement_id = saved_measurement.id
                    self.last_error = None

                logger.debug(
                    f"Background collection #{self.run_count} completed: id={saved_measurement.id}, "
                    f"latency={saved_measurement.latency_ms}ms, iface={saved_measurement.interface_name}"
                )
                return saved_measurement.id
            finally:
                if managed and db is not None:
                    db.close()

        except Exception as exc:
            with self._lock:
                self.last_error = str(exc)
            logger.warning(f"Background collection error: {exc}")
            return None

    def _loop(self) -> None:
        """Background execution loop."""
        # Initial run shortly after startup
        time.sleep(1.0)
        while not self._stop_event.is_set():
            self.run_single_collection()
            # Wait for next interval or until stop requested
            self._stop_event.wait(timeout=float(self.interval_seconds))


# Global collector daemon instance
collector_daemon = NetworkCollectorDaemon()
