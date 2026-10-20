# EnergyInsight API. Built from the repository root (it also needs database/).
FROM node:22-alpine

WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY database/schema.sql ../database/schema.sql
COPY database/data ../database/data

ENV NODE_ENV=production PORT=4000
EXPOSE 4000
USER node

# Seed the demo data on the very first start only, then run the API.
CMD ["sh", "-c", "node scripts/setup-db.js --if-empty && node src/server.js"]
