FROM node:18-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install --omit=dev
COPY index.js ./

# We'll mount ./client as /app/public via docker-compose volume
EXPOSE 3000
CMD ["node", "index.js"]
