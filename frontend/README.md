# PathPilot Frontend

React + Vite + TypeScript frontend for the education/career decision-support platform.

## Run
```bash
npm install
npm run dev
```

The UI defaults to `http://localhost:8000` for the FastAPI backend. Override with:
```bash
VITE_API_BASE=http://localhost:8000 npm run dev
```

The app has a local fallback so the UI remains explorable without the backend.
