import subprocess
import os
import re
from pathlib import Path

# Configuration
AGENT_DIR = Path("gemini/agents")
TASK_FILE = Path("gemini/next-tasks.md")
PROJECT_ROOT = Path(".")
CONTEXT_FILES = ["index.html", "sql.html", "php.html", "java.html", "forum.html", "server-root.html", "game.js", "style.css", "report.html", "gemini/GEMINI.md"]

def gemini(prompt):
    print(f"--- Calling Gemini CLI ---")
    result = subprocess.run(
        ["gemini", "-p", prompt],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"Error calling gemini: {result.stderr}")
        return ""
    return result.stdout

def get_context():
    context = ""
    for file_path in CONTEXT_FILES:
        p = PROJECT_ROOT / file_path
        if p.exists():
            context += f"\n\n--- FILE: {file_path} ---\n"
            context += p.read_text()
    
    if TASK_FILE.exists():
        context += f"\n\n--- FILE: next-tasks.md ---\n"
        context += TASK_FILE.read_text()
        
    return context

def apply_diff(diff_text):
    files_changed = []
    parts = re.split(r'^--- ', diff_text, flags=re.MULTILINE)
    for part in parts[1:]:
        lines = part.splitlines()
        if not lines: continue
        filename = lines[0].strip()
        if len(lines) < 2 or not lines[1].startswith("+++"): continue
        content_lines = lines[2:]
        if content_lines and content_lines[0].startswith("@@"): content_lines = content_lines[1:]
        file_path = PROJECT_ROOT / filename
        if not file_path.exists():
            print(f"Warning: File {filename} not found.")
            continue
        current_content = file_path.read_text()
        old_block = []
        new_block = []
        for line in content_lines:
            if line.startswith("-"): old_block.append(line[1:])
            elif line.startswith("+"): new_block.append(line[1:])
            else:
                if old_block or new_block:
                    target = "\n".join(old_block)
                    replacement = "\n".join(new_block)
                    if target in current_content: current_content = current_content.replace(target, replacement)
                    old_block, new_block = [], []
        if old_block or new_block:
            target = "\n".join(old_block)
            replacement = "\n".join(new_block)
            if target in current_content: current_content = current_content.replace(target, replacement)
        file_path.write_text(current_content)
        files_changed.append(filename)
        print(f"Applied changes to {filename}")
    return files_changed

def git_commit(message):
    print(f"[GIT] Committing changes: {message}")
    subprocess.run(["git", "add", "."])
    subprocess.run(["git", "commit", "-m", message])

def run_pipeline():
    print("🚀 Starting Autonomous Pipeline")
    
    print("\n[DIRECTOR] Planning next move...")
    director_prompt = (AGENT_DIR / "director.md").read_text() + "\n\nCONTEXT:\n" + get_context()
    task_output = gemini(director_prompt)
    
    if "# UPDATED NEXT-TASKS" in task_output:
        next_tasks_content = task_output.split("# UPDATED NEXT-TASKS")[1].strip()
        TASK_FILE.write_text(next_tasks_content)
        print("Updated next-tasks.md")

    print("\n[DEVELOPER] Implementing task...")
    developer_prompt = (AGENT_DIR / "developer.md").read_text() + "\n\nTASK:\n" + task_output + "\n\nCONTEXT:\n" + get_context()
    implementation = gemini(developer_prompt)
    apply_diff(implementation)

    for i in range(3):
        print(f"\n[REVIEWER] (Attempt {i+1}) Checking architecture...")
        reviewer_prompt = (AGENT_DIR / "reviewer.md").read_text() + "\n\nIMPLEMENTATION:\n" + implementation + "\n\nCONTEXT:\n" + get_context()
        review = gemini(reviewer_prompt)
        
        print(f"\n[PLAYTESTER] (Attempt {i+1}) Attacking game...")
        playtester_prompt = (AGENT_DIR / "playtester.md").read_text() + "\n\nCONTEXT:\n" + get_context()
        playtest = gemini(playtester_prompt)
        
        if "PASS" in review and "PASS" in playtest:
            print("\n✅ TASK COMPLETE AND VALIDATED!")
            content = TASK_FILE.read_text()
            content = content.replace("[IN_PROGRESS]", "[DONE]")
            TASK_FILE.write_text(content)
            
            task_match = re.search(r"# CURRENT TASK\n(.*)", task_output)
            task_title = task_match.group(1).strip() if task_match else "Autonomous Update"
            git_commit(f"Gemini: {task_title}")
            return True
            
        print("\n[FIXER] Issues found. Patching...")
        fixer_prompt = (AGENT_DIR / "fixer.md").read_text() + f"\n\nREVIEWER REPORT:\n{review}\n\nPLAYTESTER REPORT:\n{playtest}\n\nCONTEXT:\n" + get_context()
        implementation = gemini(fixer_prompt)
        apply_diff(implementation)
        
    print("\n❌ Pipeline failed to stabilize after 3 attempts.")
    return False

if __name__ == "__main__":
    while True:
        if not run_pipeline(): break
        print("\nWaiting for next cycle...")
        break
