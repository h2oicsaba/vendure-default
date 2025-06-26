FROM node:20

WORKDIR /usr/src/app

# Környezeti változók beállítása
ENV NODE_ENV=production
ENV APP_ENV=prod

# Függőségek telepítése
COPY package.json ./
COPY package-lock.json ./
RUN npm install --production

# Forrásfájlok másolása és build
COPY . .
RUN npm run build

# Alkalmazás indítása
CMD ["npm", "run", "start:server"]
