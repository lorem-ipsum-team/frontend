FROM node:slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src
ARG REACT_APP_AUTHORIZATION_URL
ARG REACT_APP_API_URL
RUN npm run build


FROM nginx:1-alpine AS run
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD [ "nginx", "-g", "daemon off;" ]
