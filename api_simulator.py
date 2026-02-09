import os
import random
from datetime import datetime

def simulate_api_changes(items: list[dict]) -> list[dict]:
    """
    Simulate API updates locally (price, description).
    Runs ONLY if SIMULATE_API_CHANGES=true.
    """
    if os.getenv("SIMULATE_API_CHANGES") != "true":
        return items

    mutated = []

    for item in items:
        item = item.copy()

        # randomly modify ~30% items
        if random.random() < 0.3:
            item["price"] = item.get("price", 0) + random.randint(-20, 50)
            item["description"] = (
                item.get("description", "") + " (updated)"
            )
            item["updated_at"] = datetime.utcnow().isoformat()

        mutated.append(item)

    return mutated
