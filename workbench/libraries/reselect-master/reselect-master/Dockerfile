# Use the latest Ubuntu base image
FROM ubuntu:latest

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    jq \
    wget \
    bash \
    sed

# Set up environment variables (you can modify as required)
ENV VSCODE_ARCH=x64
ENV VSCODE_QUALITY=stable

# Copy the script and the recipe.yml to the container
COPY ./your_script_name.sh /app/
COPY ./recipe.yml /app/

# Set working directory
WORKDIR /app

# Run the script
CMD ["/bin/bash", "your_script_name.sh"]
