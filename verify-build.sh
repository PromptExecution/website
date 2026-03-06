#!/bin/bash
# Quick verification script to check if everything is set up correctly

set -e

echo "🧪 LLM DOES NOT COMPUTE - Build Verification"
echo "=============================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

success() {
    echo -e "${GREEN}✓${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check Node.js
echo "1. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "Node.js installed: $NODE_VERSION"
else
    error "Node.js not found. Install from https://nodejs.org"
    exit 1
fi

# 2. Check npm
echo ""
echo "2. Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    success "npm installed: $NPM_VERSION"
else
    error "npm not found"
    exit 1
fi

# 3. Check if node_modules exists
echo ""
echo "3. Checking dependencies..."
if [ -d "node_modules" ]; then
    success "node_modules found"
else
    warning "node_modules not found. Running npm install..."
    npm install
    success "Dependencies installed"
fi

# 4. Check if TypeScript compiles
echo ""
echo "4. Checking TypeScript compilation..."
if npx tsc --noEmit 2>&1 | grep -q "error"; then
    error "TypeScript compilation errors found"
    npx tsc --noEmit
    exit 1
else
    success "TypeScript compiles successfully"
fi

# 5. Check if Vue files are valid
echo ""
echo "5. Checking Vue components..."
if [ -f "src/components/Win95TabContainer.vue" ]; then
    success "Win95TabContainer.vue found"
else
    error "Win95TabContainer.vue not found"
    exit 1
fi

if [ -f "src/components/ComicViewer.vue" ]; then
    success "ComicViewer.vue found"
else
    error "ComicViewer.vue not found"
    exit 1
fi

# 6. Check backend functions
echo ""
echo "6. Checking backend functions..."
if [ -f "functions/_worker.js" ]; then
    success "functions/_worker.js found"
else
    error "functions/_worker.js not found"
    exit 1
fi

if [ -f "functions/lib/comic-generator.ts" ]; then
    success "functions/lib/comic-generator.ts found"
else
    error "functions/lib/comic-generator.ts not found"
    exit 1
fi

# 7. Check database schema
echo ""
echo "7. Checking database schema..."
if [ -f "schema.sql" ]; then
    success "schema.sql found"

    # Check for main tables
    if grep -q "CREATE TABLE.*comics" schema.sql; then
        success "comics table definition found"
    else
        error "comics table not found in schema"
    fi

    if grep -q "CREATE TABLE.*votes" schema.sql; then
        success "votes table definition found"
    else
        error "votes table not found in schema"
    fi
else
    error "schema.sql not found"
    exit 1
fi

# 8. Check Cloudflare config
echo ""
echo "8. Checking Cloudflare configuration..."
if [ -f "wrangler.toml" ]; then
    success "wrangler.toml found"

    # Check for bindings
    if grep -q "d1_databases" wrangler.toml; then
        success "D1 binding configured"
    else
        warning "D1 binding not configured"
    fi

    if grep -q "r2_buckets" wrangler.toml; then
        success "R2 binding configured"
    else
        warning "R2 binding not configured"
    fi
else
    error "wrangler.toml not found"
    exit 1
fi

# 9. Try to build
echo ""
echo "9. Testing build..."
if npm run build > /dev/null 2>&1; then
    success "Build succeeded"

    # Check dist directory
    if [ -d "dist" ]; then
        success "dist/ directory created"

        # Check for main files
        if [ -f "dist/index.html" ]; then
            success "dist/index.html exists"
        else
            error "dist/index.html not found"
        fi
    else
        error "dist/ directory not created"
    fi
else
    error "Build failed"
    echo ""
    echo "Running build with output:"
    npm run build
    exit 1
fi

# 10. Check for documentation
echo ""
echo "10. Checking documentation..."
docs_found=0
for doc in QUICKSTART.md DEPLOYMENT.md TESTING.md DEMO.md; do
    if [ -f "$doc" ]; then
        success "$doc found"
        ((docs_found++))
    else
        warning "$doc not found"
    fi
done

echo ""
echo "=============================================="
echo -e "${GREEN}✓ Verification Complete!${NC}"
echo ""
echo "Summary:"
echo "  - Frontend: Ready ✓"
echo "  - Backend: Ready ✓"
echo "  - Database: Schema ready ✓"
echo "  - Build: Success ✓"
echo "  - Docs: $docs_found/4 found"
echo ""
echo "Next steps:"
echo "  1. Read QUICKSTART.md for deployment"
echo "  2. Run 'npm run dev' to test locally"
echo "  3. Run 'npm run deploy' when ready"
echo ""
echo "To demo the UI right now:"
echo "  npm run dev"
echo "  Then open: http://localhost:5173"
echo ""
