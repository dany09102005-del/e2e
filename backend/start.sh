#!/usr/bin/env bash
set -euo pipefail

# start.sh - create venv (if missing), install requirements, and run backend
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

VENV_DIR="${ROOT_DIR}/venv310"
PYTHON_BIN="${VENV_DIR}/bin/python"
ACTIVATE="${VENV_DIR}/bin/activate"

if [ ! -f "$ACTIVATE" ]; then
  echo "Creating Python virtualenv at $VENV_DIR"
  python3 -m venv "$VENV_DIR"
  # shellcheck disable=SC1090
  source "$ACTIVATE"
  pip install --upgrade pip
  if [ -f requirements.txt ]; then
    pip install -r requirements.txt
  else
    echo "requirements.txt not found; please create one with required packages"
  fi
else
  # activate existing venv
  # shellcheck disable=SC1090
  source "$ACTIVATE"
fi

echo "Starting backend (Flask app)..."
python app.py
