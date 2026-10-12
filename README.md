# CellScope

Research prototype for reviewing nuclei in **2D fluorescence** images. It is not a clinical device and it is not validated for diagnosis.

The supported model is [StarDist](https://github.com/stardist/stardist) `2D_versatile_fluo`. Histology and brightfield are different problems and are not accepted as equivalent inputs. TIFF is not implemented.

## Run

Python 3.12 and Node 22 are the versions used here.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python scripts/generate_sample.py   # optional; the sample assets are already committed
python scripts/evaluate.py          # optional; writes data/evaluation from the synthetic split
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The first launch downloads `2D_versatile_fluo` from the StarDist model release into `~/.keras/models/StarDist2D/2D_versatile_fluo/`.

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. The dev server proxies `/api` to port 8000.

After `npm run build`, the same FastAPI process also serves `frontend/dist`, including the client-side routes.

Set `CELLSCOPE_SKIP_MODEL=1` to start the API without loading StarDist. Live analysis then returns an error. The sample-annotation review still works in the browser.

## What inference does

`POST /api/analyze` accepts one PNG or JPEG (up to 20 MB, each side 64–4096 px). The image is read in memory, oriented from EXIF, and reduced to luminance. It is normalised with `csbdeep.utils.normalize` percentiles **3 and 99.8**, then passed to `StarDist2D.predict_instances` using the thresholds stored with the weights (`prob ≈ 0.479`, `nms = 0.3`).

The response is centres, bounding boxes, 32-ray polygons, and StarDist object probabilities. Those probabilities are not calibrated class probabilities. The review slider can only hide detections the model already returned.

If the model is not loaded, the API returns **503** and does not invent detections. The built-in sample image has a separate **Review sample annotations** action. Those contours are the 2σ ellipses used to draw the synthetic field. They are not labelled as model output.

## Evaluation

`backend/scripts/evaluate.py` scores the pretrained model on six synthetic 384×288 fields (seed 7). This is not a public benchmark and not an estimate of laboratory performance.

Matching is greedy and one-to-one. A prediction matches a ground-truth nucleus only when mask IoU is at least 0.5. Ground truth is the 2σ ellipse of each painted Gaussian. Precision, recall, and F1 are micro-averaged across images. Mean absolute counting error is reported separately because a close count can hide misses cancelled by extra detections.

The committed report is the output of that script on this environment (StarDist 0.9.2, TensorFlow 2.21, CPU). OneDNN can change results slightly on another machine. The evaluation page stays empty until `backend/data/evaluation/report.json` exists.

## Tests

```bash
cd backend && .venv/bin/python -m pytest
cd frontend && npm test && npm run build
```

## Layout

- `frontend/` — React, TypeScript, Tailwind. The review workspace, analyses list, evaluation page, and technician guide.
- `backend/app/` — FastAPI, image decoding, StarDist inference, IoU matching.
- `backend/scripts/` — sample generation and evaluation.
- `docs/model.md` — model and dataset attribution.

Uploads are not written to disk and are not logged by filename.
