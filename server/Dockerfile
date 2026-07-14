FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm via Corepack
RUN corepack enable

# Install dependencies first for better layer caching
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

# Copy only server source and build a single runtime bundle
COPY server ./server
RUN pnpm exec esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Only runtime deps needed by bundled server
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/index.js"]
