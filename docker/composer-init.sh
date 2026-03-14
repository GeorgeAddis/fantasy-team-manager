#!/bin/sh
set -e
cd /app
if [ ! -f backend/artisan ]; then
  echo "Creating Laravel in ./backend..."
  composer create-project laravel/laravel backend --prefer-dist --no-interaction
  echo "Done."
else
  echo "backend/artisan already exists — skip."
fi
