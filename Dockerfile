# Build Stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build the app
COPY . .
RUN npm run build

# Production Stage
FROM nginx:stable-alpine

# Copy the built assets to Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx config template for SPA routing
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Cloud Run uses PORT env variable (default 8080)
ENV PORT=8080
EXPOSE 8080

# Use envsubst to substitute PORT at runtime, then start nginx
CMD sh -c "envsubst '\$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
