FROM node:lts-alpine3.21

WORKDIR /itowns

COPY package.json package-lock.json ./
COPY packages/Geographic/package.json ./packages/Geographic/
COPY packages/Main/package.json ./packages/Main/
COPY packages/Debug/package.json ./packages/Debug/
COPY packages/Widgets/package.json ./packages/Widgets/

RUN npm ci --ignore-scripts --prefer-offline --cache .npm

COPY . .

EXPOSE 8080

CMD ["npm", "start"]
