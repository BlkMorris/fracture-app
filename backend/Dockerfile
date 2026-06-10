FROM node:24.12.0

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]