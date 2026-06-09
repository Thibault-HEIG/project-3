import subprocess
import os
import re
import datetime
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

# ── Configuration ─────────────────────────────────────────────────────────────
AGENT_DIR    = Path("gemini/agents")
TASK_FILE    = Path("gemini/next-tasks.md")
STATUS_FILE  = Path("gemini/status.md")
LOG_FILE     = Path("gemini/agent_logs.txt")
PROJECT_ROOT = Path(".")
CONTEXT_FILES = ["README.md", "gemini/GEMINI.md"]
RPM_COOLDOWN = 2
MAIN_BRANCH  = "main"


# ── Git helpers ───────────────────────────────────────────────────────────────

def git(*args, check=True):
    """Run a git command in PROJECT_ROOT. Raises on non-zero exit if check=True."""
    result = subprocess.run(
        ["git"] + list(args),
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True
    )
    if check and result.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} failed:\n{result.stderr.strip()}")
    return result


def get_diff():
    """Return the cumulative diff of the current branch vs main."""
    result = git("diff", f"{MAIN_BRANCH}...HEAD", check=False)
    return result.stdout.strip() or "(no diff — no changes committed yet)"


def slugify(text):
    """Convert a task title to a git-safe branch slug."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"\s+", "-", text)
    return text[:50].strip("-")


# ── Project context ───────────────────────────────────────────────────────────

def get_project_map():
    file_map = "PROJECT STRUCTURE:\n"
    for path in sorted(PROJECT_ROOT.rglob("*")):
        if ".git" in path.parts or "__pycache__" in path.parts:
            continue
        depth = len(path.parts) - 1
        indent = "  " * depth
        if path.is_dir():
            file_map += f"{indent}📁 {path.name}/\n"
        else:
            size = path.stat().st_size
            file_map += f"{indent}📄 {path.name} ({size} bytes)\n"
    return file_map


def get_context(include_files=None):
    context = "SYSTEM ARCHITECTURE & GOALS:\n"
    for f in CONTEXT_FILES:
        p = PROJECT_ROOT / f
        if p.exists():
            context += f"\n--- {f} ---\n{p.read_text()}\n"
    if TASK_FILE.exists():
        context += f"\n--- next-tasks.md ---\n{TASK_FILE.read_text()}\n"
    if include_files:
        for f in include_files:
            p = PROJECT_ROOT / f
            if p.exists():
                if p.suffix == ".md" and p.stat().st_size > 100_000:
                    context += f"\n--- FILE: {f} (TRUNCATED) ---\n{p.read_text()[:5000]}...\n"
                else:
                    context += f"\n--- FILE: {f} ---\n{p.read_text()}\n"
    return context


# ── JSON extraction ───────────────────────────────────────────────────────────

def extract_json(text):
    if not text:
        return None
    start = text.find("{")
    end   = text.rfind("}")
    if start == -1 or end == -1:
        return None
    content = text[start:end + 1].strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        try:
            def fix_newlines(match):
                return match.group(0).replace("\n", "\\n")
            fixed = re.sub(r'"(.*?)"', fix_newlines, content, flags=re.DOTALL)
            return json.loads(fixed)
        except Exception:
            return None


# ── Gemini CLI call ───────────────────────────────────────────────────────────

def gemini(prompt, agent_name=""):
    for attempt in range(3):
        print(f"   [AI] Requesting {agent_name} (Attempt {attempt + 1}/3)...")
        update_status_activity(f"Agent **{agent_name}** is thinking...")
        try:
            process = subprocess.Popen(
                ["gemini", "-p", "Respond ONLY with a JSON object. No other text.", "--raw-output"],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            stdout, stderr = process.communicate(input=prompt)

            with open(LOG_FILE, "a") as f:
                f.write(f"\n\n{'='*20} {agent_name} Attempt {attempt+1} {'='*20}\n")
                f.write(f"EXIT CODE: {process.returncode}\n")
                f.write(f"STDERR: {stderr}\n")
                f.write(f"STDOUT:\n{stdout}\n")

            if process.returncode != 0:
                print(f"   [ERROR] CLI exited {process.returncode}.")
                time.sleep(2)
                continue
            if not stdout.strip():
                print(f"   [WARNING] Empty response from {agent_name}.")
                time.sleep(2)
                continue

            data = extract_json(stdout)
            if data:
                time.sleep(RPM_COOLDOWN)
                return data

            print(f"   [WARNING] {agent_name} returned invalid JSON.")
            time.sleep(2)

        except Exception as e:
            print(f"   [CRITICAL] {e}")
            break

    return None


# ── Status file helpers ───────────────────────────────────────────────────────

def update_status_header(cycle, total, task_name, status="RUNNING"):
    now    = datetime.datetime.now().strftime("%H:%M:%S")
    header = (
        f"# 🤖 Autonomous Status\n\n"
        f"## 🚀 {status}\n"
        f"**Task:** {task_name}\n"
        f"**Cycle:** {cycle}/{total}\n"
        f"**Time:** {now}\n\n---\n"
    )
    try:
        parts = STATUS_FILE.read_text().split("---", 1)
        STATUS_FILE.write_text(header + (parts[1] if len(parts) > 1 else ""))
    except Exception:
        STATUS_FILE.write_text(header + "\n## 📝 Activity\n> Ready.\n")


def update_status_activity(activity):
    try:
        content = STATUS_FILE.read_text()
        if "## 📝 Activity" in content:
            parts = content.split("## 📝 Activity", 1)
            STATUS_FILE.write_text(f"{parts[0]}## 📝 Activity\n> {activity}\n")
        else:
            STATUS_FILE.write_text(content + f"\n## 📝 Activity\n> {activity}\n")
    except Exception:
        pass


# ── Human-in-the-loop gateway ─────────────────────────────────────────────────

def notify_ready(branch_name, title):
    """Print a clear review prompt and update status. Does NOT merge."""
    border = "=" * 64
    print(f"\n{border}")
    print(f"  ✅  READY FOR REVIEW")
    print(f"  Branch : {branch_name}")
    print(f"  Task   : {title}")
    print(f"  → Open VS Code › Source Control to inspect the diff.")
    print(f"  → Merge manually, or discard with:")
    print(f"    git branch -D {branch_name}")
    print(f"{border}\n")
    update_status_activity(f"⏸ Awaiting human review on `{branch_name}`")


def notify_failed(branch_name, title):
    border = "=" * 64
    print(f"\n{border}")
    print(f"  ⚠️   VALIDATION EXHAUSTED")
    print(f"  Branch : {branch_name}")
    print(f"  Task   : {title}")
    print(f"  → Branch preserved. Inspect or delete manually.")
    print(f"{border}\n")
    update_status_activity(f"❌ Validation failed on `{branch_name}`")


# ── Main cycle ────────────────────────────────────────────────────────────────

def run_cycle(cycle_num, total):
    print(f"\n[CYCLE {cycle_num}/{total}] Starting...")

    # Always start from a clean main
    git("checkout", MAIN_BRANCH)
    
    update_status_header(cycle_num, total, "Planning", "PLANNING")

    # ── 1. DIRECTOR ────────────────────────────────────────────────────────────
    director_prompt = f"""{(AGENT_DIR / 'director.md').read_text()}

    PROJECT MAP:
    {get_project_map()}

    CONTEXT:
    {get_context()}

    IMPORTANT: You are the ARCHITECT. Design the next task.
    Return ONLY a JSON object:
    {{
    "task_title": "...",
    "frontend_task": "...",
    "backend_task": "...",
    "updated_next_tasks": "...",
    "files_to_read": ["filename.html"]
    }}
    """
    task_data = gemini(director_prompt, "Director")
    if not task_data:
        return False

    title         = task_data.get("task_title", "developing")
    frontend_task = task_data.get("frontend_task")
    backend_task  = task_data.get("backend_task")
    files_to_read = task_data.get("files_to_read", [])
    extra_files   = ["game.js"] if Path("game.js").exists() else []

    TASK_FILE.write_text(task_data.get("updated_next_tasks", ""))


    # ── 2. BRANCH ISOLATION ────────────────────────────────────────────────────
    branch_name = f"feature/{slugify(title)}"
    print(f"   [GIT] Creating branch: {branch_name}")
    git("checkout", "-b", branch_name)
    update_status_header(cycle_num, total, title, "WORKING")

    # ── 3. DEVELOPERS ──────────────────────────────────────────────────────────
    dev_updates = []
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = []
        if frontend_task:
            f_prompt = f"""{(AGENT_DIR / 'frontend_dev.md').read_text()}
    TASK:
    {frontend_task}

    CONTEXT:
    {get_context(include_files=files_to_read)}

    IMPORTANT: Return ONLY a JSON object:
    {{
    "thoughts": "...",
    "updates": [{{"filename": "...", "new_content": "..."}}]
    }}
    """
            futures.append(executor.submit(gemini, f_prompt, "Frontend Dev"))

        if backend_task:
            b_prompt = f"""{(AGENT_DIR / 'backend_dev.md').read_text()}
    TASK:
    {backend_task}

    CONTEXT:
    {get_context(include_files=files_to_read + extra_files)}

    IMPORTANT: Return ONLY a JSON object:
    {{
    "thoughts": "...",
    "updates": [{{"filename": "...", "new_content": "..."}}]
    }}
    """
            futures.append(executor.submit(gemini, b_prompt, "Backend Dev"))

        for f in futures:
            res = f.result()
            if res and "updates" in res:
                dev_updates.extend(res["updates"])

    if not dev_updates:
        print("   [SKIP] No updates from developers.")
        git("checkout", MAIN_BRANCH)
        git("branch", "-D", branch_name, check=False)
        return False

    for update in dev_updates:
        p = Path(update["filename"])
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(update["new_content"])
        print(f"   [WRITE] {update['filename']}")


    # Commit developer work immediately
    git("add", ".")
    git("commit", "-m", f"Developer: {title}")
    print(f"   [GIT] Developer changes committed.")

    # ── 4. DIFF-BASED VALIDATION LOOP ──────────────────────────────────────────
    for attempt in range(2):
        update_status_activity(f"Validating attempt {attempt + 1}/2...")
        diff = get_diff()

        rev_prompt = f"""{(AGENT_DIR / 'reviewer.md').read_text()}

GIT DIFF (exact changes introduced by this branch vs {MAIN_BRANCH}):
{diff}

IMPORTANT: Evaluate ONLY what changed above.
Return ONLY {{"status": "PASS" or "FAIL", "feedback": "..."}}"""

        play_prompt = f"""{(AGENT_DIR / 'playtester.md').read_text()}

GIT DIFF (exact changes introduced by this branch vs {MAIN_BRANCH}):
{diff}

IMPORTANT: Evaluate ONLY what changed above.
Return ONLY {{"status": "PASS" or "FAIL", "feedback": "..."}}"""

        with ThreadPoolExecutor(max_workers=2) as executor:
            rev_future  = executor.submit(gemini, rev_prompt,  "Reviewer")
            play_future = executor.submit(gemini, play_prompt, "Playtester")
            rev_data    = rev_future.result()
            play_data   = play_future.result()

        reviewer_pass  = rev_data  and rev_data.get("status")  == "PASS"
        playtester_pass = play_data and play_data.get("status") == "PASS"

        if reviewer_pass and playtester_pass:
            TASK_FILE.write_text(TASK_FILE.read_text().replace("[IN_PROGRESS]", "[DONE]"))
            # ── 5. HUMAN-IN-THE-LOOP: do NOT auto-merge ────────────────────────
            notify_ready(branch_name, title)
            update_status_header(cycle_num, total, f"AWAITING REVIEW — {branch_name}", "PAUSED")
            git("checkout", MAIN_BRANCH)
            return True

        # ── FIXER: receives diff + feedback + full file content ────────────────
        # (Fixer needs full content because it must produce complete file rewrites.)
        update_status_activity(f"Fixer running (attempt {attempt + 1})...")
        combined_feedback = " | ".join(filter(None, [
            rev_data.get("feedback",  "") if rev_data  else "Reviewer returned no data.",
            play_data.get("feedback", "") if play_data else "Playtester returned no data.",
        ]))

        fix_prompt = f"""{(AGENT_DIR / 'fixer.md').read_text()}

REVIEWER / PLAYTESTER FEEDBACK:
{combined_feedback}

GIT DIFF (what was changed so far on this branch):
{diff}

FULL FILE CONTEXT (for rewriting):
{get_context(include_files=files_to_read + extra_files)}

IMPORTANT: Return ONLY {{"updates": [{{"filename": "...", "new_content": "..."}}]}}"""

        fix_data = gemini(fix_prompt, "Fixer")
        if not fix_data:
            break

        for update in fix_data.get("updates", []):
            Path(update["filename"]).write_text(update["new_content"])

        git("add", ".")
        git("commit", "-m", f"Fixer: iteration {attempt + 1} on '{title}'")
        print(f"   [GIT] Fixer changes committed (iteration {attempt + 1}).")

    # Validation exhausted — leave branch for manual inspection, never delete it
    notify_failed(branch_name, title)
    update_status_header(cycle_num, total, f"FAILED — {branch_name}", "FAILED")
    git("checkout", MAIN_BRANCH)
    return False


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not STATUS_FILE.exists():
        STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
        STATUS_FILE.write_text("# 🤖 Autonomous Status\n\n## 📝 Activity\n> Ready.\n")

    results = []
    for i in range(1, 6):
        success = run_cycle(i, 5)
        results.append(success)
        # Each cycle is isolated — a failure does NOT abort subsequent cycles.

    passed = sum(results)
    update_status_header(5, 5, f"Done — {passed}/5 tasks passed", "FINISHED")
    print(f"\n[DONE] {passed}/5 cycles passed. Check open branches in VS Code Source Control.")