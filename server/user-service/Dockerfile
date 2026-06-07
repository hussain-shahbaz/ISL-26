FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ curl openssl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

# Generate the Prisma client against the schema.
COPY prisma ./prisma
RUN npx prisma generate

COPY . .

EXPOSE 3002
# Sync the schema to the database, then start. (db push is idempotent and
# avoids requiring a migrations history for this project.)
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && node server.js"]
