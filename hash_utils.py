import hashlib
import json

def hash_item(item: dict) -> str:
    """
    Create a stable hash for an API item.
    Used to detect changes.
    """
    data = json.dumps(item, sort_keys=True)
    return hashlib.sha256(data.encode("utf-8")).hexdigest()
