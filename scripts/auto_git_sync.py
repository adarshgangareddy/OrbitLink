#!/usr/bin/env python3
"""
OrbitLink Automated Git Sync Daemon
Automatically checks for changes every 2 minutes (120 seconds),
stages modifications, commits with descriptive timestamps, and pushes to origin main.
"""

import datetime
import os
import subprocess
import sys
import time
from pathlib import Path

# Force UTF-8 stdout if supported
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO_ROOT = Path(__file__).resolve().parent.parent
INTERVAL_SECONDS = 120  # 2 minutes


def log(message: str) -> None:
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    safe_msg = message.encode("ascii", errors="replace").decode("ascii")
    print(f"[{timestamp}] [AutoGitSync] {safe_msg}", flush=True)


def run_git_command(args: list[str]) -> tuple[int, str, str]:
    """Execute a git command in the repository root."""
    try:
        proc = subprocess.run(
            ["git"] + args,
            cwd=str(REPO_ROOT),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
            encoding="utf-8",
            errors="replace",
        )
        return proc.returncode, proc.stdout.strip(), proc.stderr.strip()
    except Exception as exc:
        return -1, "", str(exc)


def get_status_changes() -> list[str]:
    """Return a list of modified, added, or untracked file paths."""
    code, stdout, _ = run_git_command(["status", "--porcelain"])
    if code != 0 or not stdout:
        return []
    lines = [line.strip() for line in stdout.splitlines() if line.strip()]
    return lines


def auto_sync_cycle() -> None:
    """Check for modifications, stage, commit, and push."""
    changes = get_status_changes()
    if not changes:
        log("Working tree clean. No changes to push. Next check in 2 minutes.")
        return

    log(f"Detected {len(changes)} modified/untracked item(s):")
    for item in changes[:5]:
        log(f"  * {item}")
    if len(changes) > 5:
        log(f"  ... and {len(changes) - 5} more.")

    # 1. Stage all changes
    code, _, stderr = run_git_command(["add", "-A"])
    if code != 0:
        log(f"Warning: git add failed: {stderr}")
        return

    # Double check if anything was staged
    code, staged_diff, _ = run_git_command(["diff", "--cached", "--name-only"])
    if not staged_diff:
        log("No staged changes detected after git add. Skipping commit.")
        return

    # 2. Commit changes with timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    num_files = len(staged_diff.splitlines())
    commit_msg = f"auto: periodic sync ({timestamp}) - updated {num_files} file(s)"
    code, stdout, stderr = run_git_command(["commit", "-m", commit_msg])
    if code != 0:
        log(f"Warning: git commit failed: {stderr}")
        return

    log(f"Committed changes: '{commit_msg}'")

    # 3. Push to remote
    log("Pushing to origin main...")
    code, stdout, stderr = run_git_command(["push", "origin", "main"])
    if code == 0:
        log("[OK] Successfully pushed to origin main!")
    else:
        log(f"Notice: git push returned code {code}. Stderr: {stderr}")


def main() -> None:
    log(f"OrbitLink Auto-Git Sync started. Polling every {INTERVAL_SECONDS} seconds (2 minutes)...")
    log(f"Repository Root: {REPO_ROOT}")

    # Run immediate check on start
    try:
        auto_sync_cycle()
    except Exception as exc:
        log(f"Error during initial sync: {exc}")

    # Continuous 2-minute loop
    while True:
        try:
            time.sleep(INTERVAL_SECONDS)
            auto_sync_cycle()
        except KeyboardInterrupt:
            log("Auto-Git Sync daemon stopped by user.")
            sys.exit(0)
        except Exception as exc:
            log(f"Unexpected error in sync cycle: {exc}. Retrying in {INTERVAL_SECONDS}s...")


if __name__ == "__main__":
    main()
