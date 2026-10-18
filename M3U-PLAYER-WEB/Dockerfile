FROM node:22-alpine
WORKDIR /app
COPY package.json server.js sample.m3u ./
COPY public ./public
# La playlist vive in /data: su un servizio online collega qui un disco permanente.
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/data TRUST_PROXY=1
VOLUME /data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" || exit 1
CMD ["node", "server.js"]
