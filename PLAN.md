# DriveAware AI: Project Plan

Full-stack computer-vision driver drowsiness detection platform.
Read this file fully before every task. Work on ONE milestone at a time and stop for review when it is done.

## Stack
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, deployed to Vercel
- **Backend:** FastAPI (Python 3.11+), SQLite for dev / Postgres for prod, JWT auth, deployed to Render/Railway/Fly.io
- **Vision:** MediaPipe Face Mesh (runs in the browser for the live loop; Python versions kept for testing and the server-side fallback)
- **Optional ML:** small classifier trained offline in `ml/`, compared against the EAR/MAR baseline

## Project root structure
```
driveaware-ai/
├── README.md
├── PLAN.md
├── docker-compose.yml
├── .env.example
├── frontend/
│   └── src/{app,components,hooks,lib,styles}
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/        (auth, sessions, reports, stream)
│   │   ├── core/       (config, security, logging)
│   │   ├── db/         (models, schemas, database)
│   │   ├── services/   (face_landmarks, eye_analysis, yawn_detection, risk_engine, report_builder)
│   │   └── ml/         (model.py, weights/)
│   └── tests/
├── ml/                 (notebooks, data, train.py, evaluate.py, configs, results)
├── docs/               (architecture.png, evaluation-report.md, screenshots)
├── demo/
└── .github/workflows/
```

## Rules for the agent
1. Do only the current milestone. Do not scaffold future features.
2. Keep functions small and typed. Add docstrings to everything in `services/`.
3. All thresholds (EAR, MAR, PERCLOS window, alarm levels) live in one config file, never hardcoded.
4. Write unit tests for every function in `services/` using synthetic landmark data.
5. Never commit secrets or datasets. Use `.env` and `.gitignore`.
6. After each milestone: list the files changed, how to run it, and how to verify it works.

## Detection logic (reference)
- **EAR** = (‖p2−p6‖ + ‖p3−p5‖) / (2·‖p1−p4‖). Eye is closed when EAR < ~0.21 (tune per user).
- **Blink:** EAR below threshold for 2–6 consecutive frames. **Drowsy closure:** > ~0.5 s.
- **PERCLOS:** % of time eyes are closed over a rolling 60 s window.
- **MAR** (mouth aspect ratio) above ~0.6 for more than ~1.5 s counts as a yawn.
- **Risk score (0–100):** weighted mix of PERCLOS, long closures, blink rate and yawn count.
- **Alarm levels:** 0 OK → 1 Warning (soft banner) → 2 Alert (sound) → 3 Critical (loud, repeating).
- Add a short per-user calibration step (first ~10 s of open eyes) to set personal baselines.

## Milestones

### M1: Project skeleton
- Create the folder structure, `.gitignore`, `.env.example`, README stub.
- FastAPI `/health` endpoint, Next.js home page.
- **Done when:** both apps run locally and `/health` returns 200.

### M2: Real-time webcam monitoring
- `useWebcam` hook, `WebcamFeed` component, MediaPipe Face Mesh with landmark overlay.
- Handle permission denied and no face detected gracefully.
- **Done when:** live video shows landmarks at 15+ FPS.

### M3: Eye-closure and blink analysis
- Implement EAR, blink counter, closure duration, PERCLOS in `eye_analysis.py` (and a TS port for the browser).
- **Done when:** unit tests pass and live EAR value shows on screen.

### M4: Yawn detection
- Implement MAR in `yawn_detection.py` (and TS port) with a duration filter.
- **Done when:** a real yawn is counted once and talking is not counted.

### M5: Risk score and escalating alarms
- `risk_engine.py` plus `useAlarm` hook, `AlarmBanner`, `RiskGauge`, audio in `public/`.
- **Done when:** the alarm level escalates and de-escalates smoothly without flickering (add hysteresis).

### M6: Interactive monitoring dashboard
- Live gauge, EAR/MAR charts, blink rate, yawn count, alarm status, start/stop controls.
- **Done when:** a full live session can be run from one page.

### M7: Authentication and saved sessions
- Signup/login (JWT), session model, save/list/delete sessions.
- Frontend sends only metrics (EAR, MAR, risk, events), not video frames.
- **Done when:** a user can log in, finish a session and see it in their history.

### M8: Session analytics and event timeline
- `SessionCharts` and `EventTimeline` (drowsy events, yawns, alarms with timestamps).
- **Done when:** a saved session replays as a timeline.

### M9: PDF safety reports
- `report_builder.py` and `/reports/{session_id}` endpoint, download button in the UI.
- **Done when:** the PDF includes summary stats, charts and the event list.

### M10: Evaluation
- `ml/evaluate.py` reports precision, recall, F1 and confusion matrix.
- Test conditions: normal light, low light, glasses, several users.
- Goal: catch drowsiness while keeping false alarms low. Report false alarms per hour.
- Write the results table into `docs/evaluation-report.md`.

### M11: Responsive design and deployment
- Mobile-friendly layouts. Frontend to Vercel, backend to Python hosting.
- CORS, environment variables, HTTPS (required for webcam access).

### M12: Documentation
- README (features, setup, architecture, evaluation table, screenshots, limitations).
- `docs/architecture.png`, demo video link in `demo/`.

## Definition of done (whole project)
- [x] All 10 features checked off
- [x] Tests pass in CI
- [x] Evaluation table in README
- [x] Live demo URL + demo video
- [x] Limitations and privacy note (video never leaves the browser)
