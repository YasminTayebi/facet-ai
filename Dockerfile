FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-slim AS runtime
ENV NODE_ENV=production PORT=8787
WORKDIR /app
RUN useradd --create-home --uid 10001 facet
COPY --from=build --chown=facet:facet /app/node_modules ./node_modules
COPY --from=build --chown=facet:facet /app/dist ./dist
COPY --from=build --chown=facet:facet /app/server ./server
COPY --from=build --chown=facet:facet /app/shared ./shared
COPY --from=build --chown=facet:facet /app/package.json ./package.json
RUN mkdir -p /app/data && chown facet:facet /app/data
USER facet
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["npm", "start"]

