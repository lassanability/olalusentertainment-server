FROM node:22-alpine

RUN apk add --no-cache tzdata dumb-init

ENV NODE_ENV=production

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 1700

CMD ["dumb-init", "node", "app.js"]
