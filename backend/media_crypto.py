"""
AES-256-GCM encryption for media stored in MongoDB.

Why GCM: authenticated encryption (confidentiality + integrity in one pass).
Each payload has a unique random 12-byte nonce.

Blob layout stored in the `data` field (Base64 str to keep JSON-safe docs):
    base64( nonce[12] || ciphertext_with_tag )

Where ciphertext_with_tag = AES-256-GCM encrypt(key, nonce, plaintext).
This way an attacker reading the DB only sees random-looking bytes.
"""
from __future__ import annotations

import base64
import hashlib
import os
from functools import lru_cache
from typing import Optional

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_NONCE_BYTES = 12


@lru_cache(maxsize=1)
def _get_key() -> bytes:
    """Derive a 32-byte AES-256 key from the MEDIA_ENCRYPTION_KEY env var.

    Accepts either a 64-char hex string (already 32 bytes) or any passphrase
    (hashed with SHA-256 to produce a 32-byte key). Fails fast if missing.
    """
    raw = os.environ.get("MEDIA_ENCRYPTION_KEY", "").strip()
    if not raw:
        raise RuntimeError(
            "MEDIA_ENCRYPTION_KEY non configurata. Aggiungi la chiave in backend/.env "
            "(suggerita: 64 caratteri hex = 32 byte)."
        )
    # If exactly 32 bytes in hex, use directly
    if len(raw) == 64:
        try:
            k = bytes.fromhex(raw)
            if len(k) == 32:
                return k
        except ValueError:
            pass
    # Fallback: derive 32-byte key from passphrase
    return hashlib.sha256(raw.encode("utf-8")).digest()


def encrypt_bytes(plaintext: bytes) -> str:
    """Encrypt raw bytes, return Base64 string ready to store in Mongo."""
    key = _get_key()
    nonce = os.urandom(_NONCE_BYTES)
    aes = AESGCM(key)
    ct = aes.encrypt(nonce, plaintext, associated_data=None)
    blob = nonce + ct
    return base64.b64encode(blob).decode("ascii")


def decrypt_blob(blob_b64: str) -> bytes:
    """Decrypt a Base64 blob produced by encrypt_bytes. Raises on tamper/key-mismatch."""
    key = _get_key()
    blob = base64.b64decode(blob_b64)
    if len(blob) < _NONCE_BYTES + 16:
        raise ValueError("Blob cifrato troppo corto o corrotto")
    nonce, ct = blob[:_NONCE_BYTES], blob[_NONCE_BYTES:]
    aes = AESGCM(key)
    return aes.decrypt(nonce, ct, associated_data=None)


def is_encrypted_marker() -> str:
    """Marker stored next to data to flag encrypted payload. Used for safe fallback
    when reading legacy un-encrypted docs (if any)."""
    return "aes-256-gcm"


def generate_key_hex() -> str:
    """Helper to produce a fresh 64-char hex key — useful for the ops docs."""
    return os.urandom(32).hex()
