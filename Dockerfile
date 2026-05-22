# Production image: Node 18 on Debian (glibc) — bcrypt native addon builds reliably here
FROM node:18-bookworm-slim AS base

# Build tools for bcrypt (node-gyp); dumb-init for graceful PID 1 signal handling
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ dumb-init \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Install deps in Linux — do not COPY node_modules from the host (.dockerignore blocks it)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Application source only
COPY server.js ./
COPY public ./public
COPY views ./views

# Run as non-root
RUN chown -R node:node /app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/', (r) => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["dumb-init", "node", "server.js"]
