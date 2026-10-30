from enum import Enum


class UserRole(str, Enum):
    OWNER = "owner"
    TECHNICIAN = "technician"


class ComponentType(str, Enum):
    PANEL = "panel"
    INVERTER = "inverter"
    OTHER = "other"


class MonitoringMode(str, Enum):
    SIMULATED = "simulated"
    LIVE = "live"


class DataSource(str, Enum):
    SIMULATED = "simulated"
    LIVE = "live"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class VerificationStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class ServiceRequestStatus(str, Enum):
    REQUESTED = "requested"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class ChatRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"