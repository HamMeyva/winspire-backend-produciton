# Use an official Node.js runtime as a parent image (LTS version)
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
# It's highly recommended to have package-lock.json in your repository
COPY package*.json ./

# Install app dependencies for production
# Using --omit=dev to skip development dependencies for a smaller production image
RUN npm install --omit=dev

# Copy the rest of the application source code
# This will respect the .dockerignore file
COPY . .

# The port your app runs on. Elastic Beanstalk will use this.
# Your previous .env had PORT=5010. Ensure your app uses process.env.PORT
EXPOSE 5010

# Define the command to run your app
CMD ["node", "src/index.js"]