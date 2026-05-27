#!/usr/bin/env python3
"""
Backfill May 2026 snapshots_diarios for the 2 active accounts.
Calls daily_report DailySync logic for each day with correct time_range.
Single Python process — avoids OOM from re-launching Python 26 times.
"""
import sys
import os
from datetime import date, timedelta

# Allow daily_report.py to read its config
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Patch sys.argv so daily_report.run() picks up our date arg each iteration
from daily_report import MetaAdsDataSync, logger


def main():
    sync = MetaAdsDataSync()
    start = date(2026, 5, 1)
    end = date(2026, 5, 26)  # yesterday inclusive
    failures = []
    cur = start
    while cur <= end:
        # Inject the date the way daily_report.run() parses it
        sys.argv = ["daily_report.py", cur.isoformat()]
        logger.info(f"\n========== BACKFILL DAY: {cur.isoformat()} ==========")
        try:
            ok = sync.run()
            if not ok:
                failures.append(cur.isoformat())
        except Exception as e:
            logger.exception(f"Day {cur.isoformat()} crashed: {e}")
            failures.append(cur.isoformat())
        cur += timedelta(days=1)

    print("\n" + "=" * 60)
    print(f"Backfill done. {(end - start).days + 1} days attempted.")
    if failures:
        print(f"Failed: {failures}")
        sys.exit(1)
    print("All days succeeded.")


if __name__ == "__main__":
    main()
