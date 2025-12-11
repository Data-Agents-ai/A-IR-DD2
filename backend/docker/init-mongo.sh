#!/bin/bash

# MongoDB initialization script
# This script runs automatically when the container starts
# It creates the application database and sets up initial authentication

set -e

echo "MongoDB initialization script starting..."

# Wait for MongoDB to be ready
until mongosh --username admin --password SecurePassword123! --authenticationDatabase admin --eval "db.version()" &>/dev/null; do
  echo "Waiting for MongoDB to be ready..."
  sleep 2
done

echo "MongoDB is ready!"

# Run the collections initialization script
mongosh --username admin --password SecurePassword123! --authenticationDatabase admin < /docker-entrypoint-initdb.d/init-collections.js

echo "MongoDB initialization complete!"
