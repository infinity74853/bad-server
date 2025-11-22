FROM node:22-alpine
RUN mkdir /app
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN mkdir -p /app/src/public/images
RUN mkdir -p /app/src/public/temp
RUN mkdir -p /app/src/public/uploads
CMD ["npm", "run", "dev"]
