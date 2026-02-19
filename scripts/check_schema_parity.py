#!/usr/bin/env python3
"""Validate schema v2 fixtures and cross-platform parity contracts."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DIR = ROOT / "docs" / "fixtures" / "schema-v2"

REQUIRED_FILES = (
    "ios-live-snapshot.json",
    "android-live-snapshot.json",
    "ios-pending-crash.json",
    "android-pending-crash.json",
)

EXPECTED_ENVELOPE_KEYS = {
    "schema_version",
    "session_id",
    "platform",
    "app_version",
    "build_number",
    "os_version",
    "device_model",
    "export_source",
    "capture_reason",
    "generated_at_unix_ms",
    "events",
}

EXPECTED_EVENT_KEYS = {
    "seq",
    "timestamp_unix_ms",
    "uptime_ms",
    "type",
    "thread",
    "severity",
    "attrs",
}


class ValidationError(RuntimeError):
    pass


def load_fixture(name: str) -> dict:
    path = FIXTURE_DIR / name
    if not path.exists():
        raise ValidationError(f"Missing fixture file: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure(condition: bool, message: str) -> None:
    if not condition:
        raise ValidationError(message)


def validate_envelope_shape(name: str, envelope: dict) -> None:
    keys = set(envelope.keys())
    ensure(keys == EXPECTED_ENVELOPE_KEYS, f"{name}: unexpected envelope keys: {sorted(keys)}")
    ensure(envelope["schema_version"] == 2, f"{name}: schema_version must be 2")
    ensure(isinstance(envelope["events"], list), f"{name}: events must be a list")

    for index, event in enumerate(envelope["events"]):
        event_keys = set(event.keys())
        ensure(event_keys == EXPECTED_EVENT_KEYS, f"{name}: event[{index}] keys mismatch: {sorted(event_keys)}")
        ensure(isinstance(event["attrs"], dict), f"{name}: event[{index}].attrs must be a map")


def validate_semantics(name: str, envelope: dict) -> None:
    if "live-snapshot" in name:
        ensure(envelope["export_source"] == "live_snapshot", f"{name}: export_source must be live_snapshot")
        ensure(envelope["capture_reason"] == "manual_export", f"{name}: capture_reason must be manual_export")
    elif "pending-crash" in name:
        ensure(envelope["export_source"] == "pending_crash", f"{name}: export_source must be pending_crash")
        ensure(envelope["capture_reason"] in {"uncaught_exception", "startup_pending_detection"}, f"{name}: unexpected capture_reason")
    else:
        raise ValidationError(f"{name}: unknown fixture category")


def validate_pair_parity(lhs_name: str, rhs_name: str, lhs: dict, rhs: dict) -> None:
    ensure(lhs["schema_version"] == rhs["schema_version"], f"{lhs_name}/{rhs_name}: schema_version mismatch")
    ensure(lhs["export_source"] == rhs["export_source"], f"{lhs_name}/{rhs_name}: export_source mismatch")
    ensure(lhs["capture_reason"] == rhs["capture_reason"], f"{lhs_name}/{rhs_name}: capture_reason mismatch")
    ensure(len(lhs["events"]) == len(rhs["events"]), f"{lhs_name}/{rhs_name}: event count mismatch")

    for index, (left_event, right_event) in enumerate(zip(lhs["events"], rhs["events"])):
        ensure(left_event["seq"] == right_event["seq"], f"{lhs_name}/{rhs_name}: seq mismatch at index {index}")
        ensure(left_event["type"] == right_event["type"], f"{lhs_name}/{rhs_name}: type mismatch at index {index}")
        ensure(left_event["thread"] == right_event["thread"], f"{lhs_name}/{rhs_name}: thread mismatch at index {index}")
        ensure(left_event["severity"] == right_event["severity"], f"{lhs_name}/{rhs_name}: severity mismatch at index {index}")
        ensure(
            set(left_event["attrs"].keys()) == set(right_event["attrs"].keys()),
            f"{lhs_name}/{rhs_name}: attrs key mismatch at index {index}",
        )


def main() -> int:
    try:
        fixtures = {name: load_fixture(name) for name in REQUIRED_FILES}
        for name, envelope in fixtures.items():
            validate_envelope_shape(name, envelope)
            validate_semantics(name, envelope)

        validate_pair_parity(
            "ios-live-snapshot.json",
            "android-live-snapshot.json",
            fixtures["ios-live-snapshot.json"],
            fixtures["android-live-snapshot.json"],
        )
        validate_pair_parity(
            "ios-pending-crash.json",
            "android-pending-crash.json",
            fixtures["ios-pending-crash.json"],
            fixtures["android-pending-crash.json"],
        )
    except ValidationError as error:
        print(f"[schema-parity] FAIL: {error}", file=sys.stderr)
        return 1

    print("[schema-parity] PASS: schema-v2 fixtures are structurally aligned")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
