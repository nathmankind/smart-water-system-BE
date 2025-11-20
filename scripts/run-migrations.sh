#!/bin/sh
set -e

echo "Running database migrations..."
npm run typeorm migration:run -d src/config/typeorm.config.ts

echo "Migrations completed successfully!"