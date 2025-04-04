FROM node:18-alpine AS build



# Set working directory

WORKDIR /app



# Copy package.json and package-lock.json

COPY package*.json ./



# Install dependencies

RUN npm install



# Copy the rest of the application code

COPY . .



# Build the React app

RUN npm run build



RUN npm install --save-dev tsx



# # Serve the app using a lightweight web server

# FROM nginx:alpine



# # Copy built React files to Nginx public directory

# COPY --from=build /app/build /usr/share/nginx/html



# Expose port 80

EXPOSE 5000



# Start Nginx

# CMD ["nginx", "-g", "daemon off;"]



CMD ["npm", "run", "dev"]FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the React app
RUN npm run build

RUN npm install --save-dev tsx

# # Serve the app using a lightweight web server
# FROM nginx:alpine

# # Copy built React files to Nginx public directory
# COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 5000

# Start Nginx
# CMD ["nginx", "-g", "daemon off;"]

CMD ["npm", "run", "dev"]