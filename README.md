# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Running the application (frontend + backend)

Development options:

- Run frontend dev server (Vite):

```bash
npm install
npm run dev
```

- Run backend (Flask) only:

```bash
python backend/app.py
# or on Windows if python launcher is required:
py backend/app.py
```

- Run both frontend and backend concurrently (recommended):

```bash
npm install
npm run dev:full
```

Production build (Flask will serve built assets from `dist`):

```bash
npm install
npm run build
python backend/app.py
```

Docker (build & run):

```bash
docker build -t library-app .
docker run -p 8080:8080 library-app
```

Notes:
- The Vite dev server proxies `/api` requests to the Flask backend on `http://localhost:5000` (see `vite.config.js`).
- The Flask backend has CORS enabled for `/api/*` routes, so the frontend can call the API during development.
