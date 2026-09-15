"""
CloudPulse Python SDK
Monitor any Python application with 2-3 lines of code
"""
import requests
import time
import threading
import json
from typing import Dict, Any, Optional, List
from functools import wraps


class CloudPulse:
    """
    CloudPulse monitoring client for Python applications

    Usage:
        from cloudpulse import CloudPulse

        monitor = CloudPulse(api_key="your-key", api_url="https://...")

        # Track metrics
        monitor.track_metric('api.requests', 1, tags={'endpoint': '/users'})

        # Trace operations
        with monitor.trace('database_query'):
            result = db.query("SELECT * FROM users")
    """

    def __init__(
        self,
        api_key: str,
        api_url: str = "http://localhost:3000/v1",
        app_id: Optional[str] = None,
        org_id: Optional[str] = None,
        buffer_size: int = 100,
        flush_interval: int = 10,
        auto_flush: bool = True,
    ):
        """
        Initialize CloudPulse client

        Args:
            api_key: API key for authentication
            api_url: CloudPulse API URL
            app_id: Application identifier (auto-generated if not provided)
            org_id: Organization identifier
            buffer_size: Number of metrics to buffer before auto-flush
            flush_interval: Seconds between auto-flushes
            auto_flush: Enable automatic background flushing
        """
        self.api_key = api_key
        self.api_url = api_url.rstrip('/')
        self.app_id = app_id or self._generate_app_id()
        self.org_id = org_id or 'default'
        self.buffer_size = buffer_size
        self.flush_interval = flush_interval

        self.metrics_buffer: List[Dict[str, Any]] = []
        self.logs_buffer: List[Dict[str, Any]] = []
        self._lock = threading.Lock()
        self._flush_thread = None

        if auto_flush:
            self._start_flush_thread()

    def _generate_app_id(self) -> str:
        """Generate app ID from API key"""
        return f"app-{self.api_key[:16]}"

    def track_metric(
        self,
        metric_name: str,
        value: float,
        tags: Optional[Dict[str, str]] = None,
        timestamp: Optional[int] = None
    ):
        """
        Track a custom metric

        Args:
            metric_name: Name of the metric (e.g., 'api.response_time')
            value: Numeric value
            tags: Optional tags/labels (e.g., {'endpoint': '/users', 'method': 'GET'})
            timestamp: Unix timestamp in milliseconds (auto-generated if not provided)
        """
        metric = {
            'metric': metric_name,
            'value': value,
            'timestamp': timestamp or int(time.time() * 1000),
            'app_id': self.app_id,
            'org_id': self.org_id,
            'tags': tags or {},
        }

        with self._lock:
            self.metrics_buffer.append(metric)

            if len(self.metrics_buffer) >= self.buffer_size:
                self._flush_metrics()

    def track_log(
        self,
        message: str,
        level: str = 'INFO',
        tags: Optional[Dict[str, str]] = None,
        attributes: Optional[Dict[str, Any]] = None,
    ):
        """
        Track a log entry

        Args:
            message: Log message
            level: Log level (DEBUG, INFO, WARN, ERROR)
            tags: Optional tags
            attributes: Optional structured attributes
        """
        log = {
            'message': message,
            'level': level.upper(),
            'timestamp': int(time.time() * 1000),
            'app_id': self.app_id,
            'org_id': self.org_id,
            'tags': tags or {},
            'attributes': attributes or {},
        }

        with self._lock:
            self.logs_buffer.append(log)

    def trace(self, operation_name: str, tags: Optional[Dict[str, str]] = None):
        """
        Context manager for tracing operations

        Usage:
            with monitor.trace('database_query'):
                result = db.query("SELECT * FROM users")
        """
        return Trace(self, operation_name, tags)

    def decorator(self, metric_name: Optional[str] = None, tags: Optional[Dict[str, str]] = None):
        """
        Decorator for automatic function tracing

        Usage:
            @monitor.decorator()
            def get_users():
                return db.query("SELECT * FROM users")
        """
        def wrapper(func):
            name = metric_name or f"{func.__module__}.{func.__name__}"

            @wraps(func)
            def wrapped(*args, **kwargs):
                start = time.time()
                try:
                    result = func(*args, **kwargs)
                    duration = (time.time() - start) * 1000
                    self.track_metric(f"{name}.duration", duration, tags=tags)
                    self.track_metric(f"{name}.success", 1, tags=tags)
                    return result
                except Exception as e:
                    duration = (time.time() - start) * 1000
                    self.track_metric(f"{name}.duration", duration, tags=tags)
                    self.track_metric(f"{name}.errors", 1, tags={**(tags or {}), 'error': type(e).__name__})
                    raise

            return wrapped
        return wrapper

    def middleware(self):
        """
        ASGI/WSGI middleware for FastAPI/Flask
        Returns middleware function that auto-instruments endpoints
        """
        # Will be implemented for FastAPI/Flask integration
        pass

    def _flush_metrics(self):
        """Send buffered metrics to CloudPulse API"""
        if not self.metrics_buffer:
            return

        metrics_to_send = self.metrics_buffer.copy()
        self.metrics_buffer.clear()

        try:
            response = requests.post(
                f"{self.api_url}/metrics",
                json={'metrics': metrics_to_send},
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                },
                timeout=5
            )

            if response.status_code == 202:
                print(f"✅ CloudPulse: Sent {len(metrics_to_send)} metrics")
            else:
                print(f"⚠️  CloudPulse: Metrics flush failed ({response.status_code})")
                # Re-add to buffer for retry
                with self._lock:
                    self.metrics_buffer.extend(metrics_to_send)

        except requests.exceptions.RequestException as e:
            print(f"❌ CloudPulse: Metrics flush error: {e}")
            # Re-add to buffer for retry
            with self._lock:
                self.metrics_buffer.extend(metrics_to_send)

    def _flush_logs(self):
        """Send buffered logs to CloudPulse API"""
        if not self.logs_buffer:
            return

        logs_to_send = self.logs_buffer.copy()
        self.logs_buffer.clear()

        try:
            response = requests.post(
                f"{self.api_url}/logs",
                json={'logs': logs_to_send},
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                },
                timeout=5
            )

            if response.status_code == 202:
                print(f"✅ CloudPulse: Sent {len(logs_to_send)} logs")

        except Exception as e:
            print(f"❌ CloudPulse: Logs flush error: {e}")

    def flush(self):
        """Manually flush all buffered data"""
        with self._lock:
            self._flush_metrics()
            self._flush_logs()

    def _start_flush_thread(self):
        """Start background thread for auto-flushing"""
        def flush_loop():
            while True:
                time.sleep(self.flush_interval)
                with self._lock:
                    self._flush_metrics()
                    self._flush_logs()

        self._flush_thread = threading.Thread(target=flush_loop, daemon=True)
        self._flush_thread.start()

    def __del__(self):
        """Flush remaining data on cleanup"""
        try:
            self.flush()
        except:
            pass


class Trace:
    """Context manager for tracing operations"""

    def __init__(self, client: CloudPulse, operation_name: str, tags: Optional[Dict[str, str]] = None):
        self.client = client
        self.operation_name = operation_name
        self.tags = tags or {}
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = (time.time() - self.start_time) * 1000  # milliseconds

        self.client.track_metric(
            f'{self.operation_name}.duration',
            duration,
            tags=self.tags
        )

        if exc_type:
            self.client.track_metric(
                f'{self.operation_name}.errors',
                1,
                tags={**self.tags, 'error_type': exc_type.__name__}
            )
        else:
            self.client.track_metric(
                f'{self.operation_name}.success',
                1,
                tags=self.tags
            )


__version__ = '1.0.0'
__all__ = ['CloudPulse', 'Trace']
