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
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx_server.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD [ "nginx", "-g", "daemon off;" ]
