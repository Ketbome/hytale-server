FROM node:25-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]
