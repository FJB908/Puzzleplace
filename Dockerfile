# Voor hosts die een Docker-image draaien (Fly.io, Koyeb, een eigen server, ...). Geen pakketten nodig.
FROM node:22-alpine
WORKDIR /app
COPY . .
ENV HOST=0.0.0.0 PORT=8000 TRUST_PROXY=1 DATA_DIR=/data
VOLUME /data
EXPOSE 8000
CMD ["node", "server/index.mjs"]
