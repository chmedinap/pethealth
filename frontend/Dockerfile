# Stage 1 — build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY src/ ./src/
COPY index.html .
COPY vite.config.js .
COPY tailwind.config.js .
COPY postcss.config.js .
RUN npm run build

# Stage 2 — serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
