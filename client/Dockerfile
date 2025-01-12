FROM node:latest
FROM nginx:latest

COPY . /usr/share/nginx/html

RUN npm install
RUN npm install fabric
RUN npm install sockjs-client @stomp/stompjs
RUN npm install --save-dev webpack webpack-cli

EXPOSE 80