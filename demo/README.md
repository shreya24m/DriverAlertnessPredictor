# DriveAware AI: Live Demo & Walkthrough Guide

This directory documents the interactive live demonstration of the DriveAware AI Driver Vigilance & Drowsiness Detection Platform.

---

## 🚀 Quick Launch

### 1. Start the FastAPI Backend
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate  # Windows (or source .venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- Interactive Swagger API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Configured thresholds endpoint: [http://localhost:8000/api/v1/config/thresholds](http://localhost:8000/api/v1/config/thresholds)

### 2. Start the Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```
- Open [http://localhost:3000](http://localhost:3000) in Chrome/Edge.
- Ensure webcam permission is granted when prompted. (Webcam access requires HTTPS or localhost).

---

## 🎬 4-Phase Demo Walkthrough

### Phase 1: Baseline Calibration & Face Tracking
1. Position yourself centered in the webcam feed.
2. The HUD indicates `Vision Status: Face Tracked` with 468 landmark mesh points drawn at 30+ FPS.
3. For the first 10 seconds, maintain natural forward-facing alertness with eyes open.
4. Observe the **Eye Metrics Card** calibrating your baseline open-eye EAR ($\sim 0.28\text{--}0.34$).

### Phase 2: Natural Speech vs. Yawn Discrimination
1. **Talking Test:** Speak a sentence naturally. Note how the live MAR fluctuates between $0.15\text{--}0.45$ for short bursts (<1.5s). The **Yawn Counter remains 0** due to the speech rejection filter.
2. **Yawn Test:** Open your mouth widely ($\text{MAR} > 0.60$) and hold for $\ge 1.5$ seconds.
3. The HUD detects a genuine yawn:
   - Counter increments by exactly 1.
   - An event `Yawn Detected (MAR > 0.60)` is posted to the chronological **Event Timeline**.
   - Composite risk score increases proportionally.

### Phase 3: Micro-Sleep Closure & Alarm Escalation
1. Close both eyes gently for $> 0.5$ seconds (simulating a micro-sleep event).
2. Observe the cascading alarm escalation:
   - **Level 1 (Warning):** Amber banner appears when risk reaches 30.
   - **Level 2 (Alert):** Orange banner triggers dual-frequency acoustic chime (`alert.wav` / Web Audio synthesizer) when risk reaches 60.
   - **Level 3 (Critical):** Red banner pulses with repetitive urgent distress alarm when risk reaches 85.
3. Re-open eyes: notice that due to the **5-point directional hysteresis buffer**, alarms do not rapidly flicker back and forth between states.

### Phase 4: Session Recording & PDF Report Export
1. Click **Start Session** in the Trip Monitoring panel.
2. Run a 30–60 second simulated drive.
3. Click **End Session**:
   - The session summary with aggregated metrics and discrete event records is saved via `POST /api/v1/sessions` to the backend database.
   - Switch to the **History & Reports** tab.
   - Click **Download PDF Report** to generate and download a formal, publication-grade executive safety summary created by ReportLab.

---

## 🔒 Privacy Guarantee
- **Zero Video Transmission:** Raw webcam video never leaves the client browser sandbox.
- Landmark extraction is performed entirely client-side via MediaPipe WebAssembly.
- The backend stores strictly anonymized numerical metrics (EAR, MAR, risk scores) and timestamps.
