from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_ROOT.parent
EVAL_DIR = BACKEND_ROOT / "data" / "evaluation"
REPORT_PATH = EVAL_DIR / "report.json"
EXAMPLES_DIR = EVAL_DIR / "examples"
FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
