FROM node:18

WORKDIR /app

COPY package.json ./
RUN npm install

COPY src ./src

RUN ls -la /app/src/routes

EXPOSE 3000
CMD ["node", "src/server.js"]
