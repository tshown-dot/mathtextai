# Use a lightweight Python/Linux base
FROM python:3.11-slim

# Install Pandoc directly into the Linux server
RUN apt-get update && apt-get install -y pandoc && rm -rf /var/lib/apt/lists/*

# Set up our working folder inside the server
WORKDIR /app

# Copy all your Mac files into the server
COPY . /app

# Install Flask and Gunicorn
RUN pip install --no-cache-dir -r requirements.txt

# Tell Render to listen on this port
EXPOSE 10000

# Start the production web server
CMD ["gunicorn", "--bind", "0.0.0.0:10000", "app:app"]
