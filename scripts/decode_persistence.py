#!/usr/bin/env python3
"""Decode CircleBox pending/checkpoint persistence files.

Supports:
- protobuf-wrapped payloads (wire v1)
- legacy raw JSON payloads
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


class DecodeError(RuntimeError):
    pass


def read_varint(data: bytes, offset: int) -> tuple[int, int]:
    shift = 0
    value = 0
    index = offset

    while index < len(data) and shift <= 63:
        byte = data[index]
        value |= (byte & 0x7F) << shift
        index += 1
        if (byte & 0x80) == 0:
            return value, index
        shift += 7

    raise DecodeError("Invalid varint while decoding persistence payload")


def skip_field(data: bytes, offset: int, wire_type: int) -> int:
    if wire_type == 0:
        _, next_offset = read_varint(data, offset)
        return next_offset
    if wire_type == 1:
        next_offset = offset + 8
        if next_offset > len(data):
            raise DecodeError("Fixed64 field exceeds payload length")
        return next_offset
    if wire_type == 2:
        length, next_offset = read_varint(data, offset)
        end_offset = next_offset + int(length)
        if end_offset > len(data):
            raise DecodeError("Length-delimited field exceeds payload length")
        return end_offset
    if wire_type == 5:
        next_offset = offset + 4
        if next_offset > len(data):
            raise DecodeError("Fixed32 field exceeds payload length")
        return next_offset
    raise DecodeError(f"Unsupported wire type: {wire_type}")


def decode_payload(data: bytes) -> bytes:
    if not data:
        raise DecodeError("Empty file")

    # Legacy path: raw JSON bytes.
    if data[0] == 0x7B:  # '{'
        return data

    index = 0
    payload: bytes | None = None

    while index < len(data):
        key, index = read_varint(data, index)
        wire_type = key & 0x7
        field_number = key >> 3

        if field_number == 1 and wire_type == 0:
            _, index = read_varint(data, index)
            continue

        if field_number == 2 and wire_type == 2:
            length, index = read_varint(data, index)
            end = index + int(length)
            if end > len(data):
                raise DecodeError("Payload field exceeds file length")
            payload = data[index:end]
            index = end
            continue

        index = skip_field(data, index, wire_type)

    if payload is None:
        raise DecodeError("No payload field found in persistence file")

    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Decode CircleBox persistence file to JSON")
    parser.add_argument("input", type=Path, help="Path to pending/checkpoint file")
    parser.add_argument("--compact", action="store_true", help="Print compact JSON")
    args = parser.parse_args()

    try:
        raw = args.input.read_bytes()
        payload = decode_payload(raw)
        obj = json.loads(payload.decode("utf-8"))
    except FileNotFoundError:
        print(f"File not found: {args.input}", file=sys.stderr)
        return 1
    except (DecodeError, UnicodeDecodeError, json.JSONDecodeError) as error:
        print(f"Decode failed: {error}", file=sys.stderr)
        return 1

    if args.compact:
        print(json.dumps(obj, separators=(",", ":")))
    else:
        print(json.dumps(obj, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
