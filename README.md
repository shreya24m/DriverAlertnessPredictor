# DriveAware AI 🚗⚡

Full-stack computer-vision driver drowsiness detection platform.

DriveAware AI uses MediaPipe Face Mesh running client-side in the browser to monitor driver alertness in real-time, detecting eye-closure durations (EAR), blinks, PERCLOS, and yawns (MAR) while calculating a live composite drowsiness risk score.

## Architecture & Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, MediaPipe Face Mesh.
- **Backend:** FastAPI (Python 3.11+), SQLite / PostgreSQL, Pydantic settings.
- **Vision & ML:** Client-side MediaPipe landmark extraction, mathematical EAR/MAR analysis, risk assessment engine.

## Project Structure

```text
DriveAware.AI/
├── PLAN.md                 # Detailed milestone roadmap and rules
├── docker-compose.yml      # Local container orchestration
├── .env.example            # Environment variables template
├── frontend/               # Next.js App Router frontend
│   └── src/
│       ├── app/            # Pages and routes
│       ├── components/     # UI and vision components
│       ├── hooks/          # React hooks (webcam, alarm, metrics)
│       ├── lib/            # Utilities and client-side detection algorithms
│       └── styles/         # Global styles
├── backend/                # FastAPI backend service
│   ├── app/
│   │   ├── main.py         # Application entry point & health check
│   │   ├── api/            # API routers (auth, sessions, reports, stream)
│   │   ├── core/           # Configuration, security, logging
│   │   ├── db/             # Models, schemas, database sessions
│   │   ├── services/       # Face landmarks, eye analysis, yawn, risk engine
│   │   └── ml/             # ML classifiers and weights
│   └── tests/              # Pytest test suite
├── ml/                     # ML training, evaluation scripts & datasets
├── docs/                   # Architecture diagrams and evaluation reports
└── demo/                   # Demo assets and media
```

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Verify backend health: [http://localhost:8000/health](http://localhost:8000/health)

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Privacy & Security
Video frames are processed strictly in the browser using client-side MediaPipe. Raw video streams are never transmitted to or stored on backend servers.
