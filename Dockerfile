# ── Stage 1: Build frontend ──────────────────────────────────────────────────
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/src/       ./src/
COPY frontend/index.html .
COPY frontend/vite.config.js .
COPY frontend/tailwind.config.js .
COPY frontend/postcss.config.js .
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# Install backend deps (production only, exact versions from the lockfile)
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY backend/src/ ./src/

# Copy compiled frontend into public/
COPY --from=frontend-build /app/frontend/dist ./public

# Run as the unprivileged "node" user (uid 1000). data/ must be writable by it;
# a new named volume inherits this ownership.
RUN mkdir -p /app/data && chown node:node /app/data
USER node

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3001}/api/health" > /dev/null || exit 1
CMD ["node", "src/index.js"]
