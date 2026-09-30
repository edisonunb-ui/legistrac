FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --chown=node:node auth.mjs server.mjs ./
COPY --chown=node:node public ./public
USER node
ENV NODE_ENV=production PORT=3040
EXPOSE 3040
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD wget -qO- http://127.0.0.1:3040/api/health || exit 1
CMD ["node","server.mjs"]