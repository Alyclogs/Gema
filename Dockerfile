FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN apt-get update && apt-get install -y --no-install-recommends python3 \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

RUN npm ci --maxsockets=3 --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

RUN npm run build \
    && npm prune --omit=dev


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

USER node

EXPOSE 8080

CMD ["node", "dist/index.js"]
