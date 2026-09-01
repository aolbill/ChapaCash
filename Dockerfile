FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
