#!/bin/bash

set -e

echo "🏗️  Building Monorepo Code Coverage Reporter..."

# Clean dist directory
echo "🧹 Cleaning dist directory..."
rm -rf dist
mkdir -p dist

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Run linter
echo "🔍 Running linter..."
npm run lint

# Build the action
echo "🔨 Building action..."
npm run build

# Verify dist directory
echo "✅ Verifying build..."
if [ ! -f "dist/index.js" ]; then
  echo "❌ Build failed: dist/index.js not found"
  exit 1
fi

echo "🎉 Build completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Test the action locally"
echo "2. Commit the dist/ directory"
echo "3. Create a release tag"
echo "4. Publish to GitHub Marketplace"
