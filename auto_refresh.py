import time
import os
from embed_and_store import embed_and_store

HOURS = int(os.getenv("AUTO_REFRESH_INTERVAL_HOURS", "24"))
INTERVAL = HOURS * 60 * 60

print(f"Auto refresh started (every {HOURS} hours)")

while True:
    try:
        embed_and_store()
    except Exception as e:
        print("Refresh failed:", e)

    print("Sleeping...")
    time.sleep(INTERVAL)
