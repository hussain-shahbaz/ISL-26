# Shared image for the Node services that live in the server package:
# gateway (app.js, runs auth-service in-process), exam, student-exam, log.
# The runtime command is overridden per service in docker-compose.
FROM node:22-bookworm-slim AS base

WORKDIR /app

# Build tools for native modules (bcrypt). curl is used by healthchecks.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Gateway + shared service dependencies.
COPY package*.json ./
RUN npm install --omit=dev

# auth-service is imported in-process by the gateway, so its deps must be
# installed in their own node_modules (resolved relative to auth-service/src).
COPY auth-service/package*.json ./auth-service/
RUN cd auth-service && npm install --omit=dev

# Application source.
COPY . .

EXPOSE 3000
CMD ["node", "app.js"]
