.PHONY: backend frontend sample evaluate test

backend:
	cd backend && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

frontend:
	cd frontend && npm run dev

sample:
	cd backend && .venv/bin/python scripts/generate_sample.py

evaluate:
	cd backend && .venv/bin/python scripts/evaluate.py

test:
	cd backend && .venv/bin/python -m pytest
	cd frontend && npm test
