# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json .
RUN npm install
COPY frontend/src/       ./src/
COPY frontend/index.html .
COPY frontend/vite.config.js .
COPY frontend/tailwind.config.js .
COPY frontend/postcss.config.js .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Install backend deps (production only)
COPY backend/package.json .
RUN npm install --omit=dev

# Copy backend source
COPY backend/src/ ./src/

# Copy compiled frontend into public/
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001
CMD ["node", "src/index.js"]
