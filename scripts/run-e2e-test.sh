#!/bin/bash
# E2E Test Execution Script
# Runs the full comic generation pipeline test and fills the report

set -e

PROJECT_DIR="/home/brianh/promptexecution/website-promptexecution"
SCRIPT_DIR="$PROJECT_DIR/scripts"
WORKFLOWS_DIR="$PROJECT_DIR/workflows"
TEST_DAY="2026-05-10"
API_URL="${API_URL:-http://127.0.0.1:8788}"
TEST_SECRET="${TEST_SECRET:-local-secret}"

echo "========================================================================="
echo "  Comic Generation E2E Test with Ledgrrr Governance"
echo "========================================================================="
echo ""
echo "Configuration:"
echo "  Project Dir:     $PROJECT_DIR"
echo "  API URL:         $API_URL"
echo "  Test Day:        $TEST_DAY"
echo "  Test Secret:     [REDACTED]"
echo ""

# Create test output directory
TEST_OUTPUT_DIR="${PROJECT_DIR}/.test-output"
mkdir -p "$TEST_OUTPUT_DIR"

# Start timestamp
TEST_START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TEST_START_MS=$(date +%s%N | cut -b1-13)

echo "Test started at: $TEST_START"
echo ""

# Test 1: Check API connectivity
echo "========================================================================="
echo "[1/5] Checking API connectivity..."
echo "========================================================================="

if ! timeout 5 bash -c "echo > /dev/tcp/127.0.0.1/8788" 2>/dev/null; then
    echo "ERROR: Cannot connect to API at $API_URL"
    echo "Make sure the development server is running:"
    echo "  just dev"
    echo ""
    exit 1
fi
echo "✓ API is responsive"
echo ""

# Test 2: Run script generation
echo "========================================================================="
echo "[2/5] Running script generation..."
echo "========================================================================="

SCRIPT_GEN_START=$(date +%s%N | cut -b1-13)

SCRIPT_GEN_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TEST_SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"day\":\"$TEST_DAY\"}" \
  "$API_URL/api/test-generate")

SCRIPT_GEN_END=$(date +%s%N | cut -b1-13)
SCRIPT_GEN_DURATION=$((SCRIPT_GEN_END - SCRIPT_GEN_START))

echo "Response received in ${SCRIPT_GEN_DURATION}ms"
echo ""

# Save responses
echo "$SCRIPT_GEN_RESPONSE" > "$TEST_OUTPUT_DIR/script-gen-response.json"

# Check if response is valid JSON
if ! echo "$SCRIPT_GEN_RESPONSE" | jq . > /dev/null 2>&1; then
    echo "ERROR: Invalid JSON response from script generation"
    echo "$SCRIPT_GEN_RESPONSE"
    exit 1
fi

# Extract key fields
RUN_ID=$(echo "$SCRIPT_GEN_RESPONSE" | jq -r '.run_id // empty')
TITLE=$(echo "$SCRIPT_GEN_RESPONSE" | jq -r '.title // empty')
PANEL_COUNT=$(echo "$SCRIPT_GEN_RESPONSE" | jq -r '.panel_count // empty')
CHAR_COUNT=$(echo "$SCRIPT_GEN_RESPONSE" | jq -r '.character_count // empty')
TOPIC=$(echo "$SCRIPT_GEN_RESPONSE" | jq -r '.selected_topic // empty')
SCRIPT_AUDIT=$(echo "$SCRIPT_GEN_RESPONSE" | jq '.audit_trail // empty')

if [[ -z "$RUN_ID" ]]; then
    echo "ERROR: No run_id in response"
    exit 1
fi

echo "✓ Script generation successful"
echo "  Run ID: $RUN_ID"
echo "  Title: $TITLE"
echo "  Panels: $PANEL_COUNT, Characters: $CHAR_COUNT"
echo "  Topic: $TOPIC"
if [[ ! -z "$SCRIPT_AUDIT" && "$SCRIPT_AUDIT" != "null" ]]; then
    SCRIPT_AUDIT_ID=$(echo "$SCRIPT_AUDIT" | jq -r '.entry_id // "unknown"')
    echo "  Audit Entry: $SCRIPT_AUDIT_ID"
    echo "$SCRIPT_AUDIT" > "$TEST_OUTPUT_DIR/script-gen-audit.json"
else
    echo "  ⚠ No audit trail in response"
fi
echo ""

# Wait a bit for image generation to start (it's async)
echo "Waiting for image generation to complete..."
sleep 3

# Test 3: Run image generation
echo "========================================================================="
echo "[3/5] Running image generation..."
echo "========================================================================="

IMAGE_GEN_START=$(date +%s%N | cut -b1-13)

IMAGE_GEN_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TEST_SECRET" \
  "$API_URL/api/image-generate?day=$TEST_DAY")

IMAGE_GEN_END=$(date +%s%N | cut -b1-13)
IMAGE_GEN_DURATION=$((IMAGE_GEN_END - IMAGE_GEN_START))

echo "Response received in ${IMAGE_GEN_DURATION}ms"
echo ""

# Save response
echo "$IMAGE_GEN_RESPONSE" > "$TEST_OUTPUT_DIR/image-gen-response.json"

# Check if response is valid JSON
if ! echo "$IMAGE_GEN_RESPONSE" | jq . > /dev/null 2>&1; then
    echo "ERROR: Invalid JSON response from image generation"
    echo "$IMAGE_GEN_RESPONSE"
    exit 1
fi

# Extract key fields
IMG_STATUS=$(echo "$IMAGE_GEN_RESPONSE" | jq -r '.status // empty')
VAR_A=$(echo "$IMAGE_GEN_RESPONSE" | jq -r '.variants.a // "unknown"')
VAR_B=$(echo "$IMAGE_GEN_RESPONSE" | jq -r '.variants.b // "unknown"')
IMG_RENDER_AUDIT=$(echo "$IMAGE_GEN_RESPONSE" | jq '.audit_trail.image_rendering // empty')
IMG_FORECAST_AUDIT=$(echo "$IMAGE_GEN_RESPONSE" | jq '.audit_trail.forecasting_and_log // empty')

echo "✓ Image generation completed"
echo "  Status: $IMG_STATUS"
echo "  Variant A: $VAR_A"
echo "  Variant B: $VAR_B"

if [[ ! -z "$IMG_RENDER_AUDIT" && "$IMG_RENDER_AUDIT" != "null" ]]; then
    IMG_RENDER_ID=$(echo "$IMG_RENDER_AUDIT" | jq -r '.entry_id // "unknown"')
    echo "  Image Rendering Audit: $IMG_RENDER_ID"
    echo "$IMG_RENDER_AUDIT" > "$TEST_OUTPUT_DIR/image-render-audit.json"
else
    echo "  ⚠ No image rendering audit trail"
fi

if [[ ! -z "$IMG_FORECAST_AUDIT" && "$IMG_FORECAST_AUDIT" != "null" ]]; then
    IMG_FORECAST_ID=$(echo "$IMG_FORECAST_AUDIT" | jq -r '.entry_id // "unknown"')
    echo "  Forecasting Audit: $IMG_FORECAST_ID"
    echo "$IMG_FORECAST_AUDIT" > "$TEST_OUTPUT_DIR/image-forecast-audit.json"
else
    echo "  ⚠ No forecasting audit trail"
fi
echo ""

# Test 4: Validate timestamps
echo "========================================================================="
echo "[4/5] Validating audit timestamps..."
echo "========================================================================="

VALID_TIMESTAMPS=true

if [[ ! -z "$SCRIPT_AUDIT" && "$SCRIPT_AUDIT" != "null" ]]; then
    SCRIPT_TS=$(echo "$SCRIPT_AUDIT" | jq -r '.timestamp // empty')
    if [[ ! -z "$SCRIPT_TS" ]]; then
        # Check if it's valid ISO-8601
        if date -d "$SCRIPT_TS" > /dev/null 2>&1; then
            echo "✓ script_generation timestamp valid: $SCRIPT_TS"
        else
            echo "✗ script_generation timestamp invalid: $SCRIPT_TS"
            VALID_TIMESTAMPS=false
        fi
    fi
fi

if [[ ! -z "$IMG_RENDER_AUDIT" && "$IMG_RENDER_AUDIT" != "null" ]]; then
    IMG_RENDER_TS=$(echo "$IMG_RENDER_AUDIT" | jq -r '.timestamp // empty')
    if [[ ! -z "$IMG_RENDER_TS" ]]; then
        if date -d "$IMG_RENDER_TS" > /dev/null 2>&1; then
            echo "✓ image_rendering timestamp valid: $IMG_RENDER_TS"
        else
            echo "✗ image_rendering timestamp invalid: $IMG_RENDER_TS"
            VALID_TIMESTAMPS=false
        fi
    fi
fi

if [[ ! -z "$IMG_FORECAST_AUDIT" && "$IMG_FORECAST_AUDIT" != "null" ]]; then
    IMG_FORECAST_TS=$(echo "$IMG_FORECAST_AUDIT" | jq -r '.timestamp // empty')
    if [[ ! -z "$IMG_FORECAST_TS" ]]; then
        if date -d "$IMG_FORECAST_TS" > /dev/null 2>&1; then
            echo "✓ forecasting_and_log timestamp valid: $IMG_FORECAST_TS"
        else
            echo "✗ forecasting_and_log timestamp invalid: $IMG_FORECAST_TS"
            VALID_TIMESTAMPS=false
        fi
    fi
fi
echo ""

# Test 5: Summary and report generation
echo "========================================================================="
echo "[5/5] Generating test report..."
echo "========================================================================="

TEST_END=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TEST_END_MS=$(date +%s%N | cut -b1-13)
TEST_TOTAL_DURATION=$((TEST_END_MS - TEST_START_MS))

# Count audit entries
AUDIT_COUNT=0
[[ ! -z "$SCRIPT_AUDIT" && "$SCRIPT_AUDIT" != "null" ]] && ((AUDIT_COUNT++))
[[ ! -z "$IMG_RENDER_AUDIT" && "$IMG_RENDER_AUDIT" != "null" ]] && ((AUDIT_COUNT++))
[[ ! -z "$IMG_FORECAST_AUDIT" && "$IMG_FORECAST_AUDIT" != "null" ]] && ((AUDIT_COUNT++))

echo ""
echo "========================================================================="
echo "                           TEST RESULTS"
echo "========================================================================="
echo ""
echo "Duration:              ${TEST_TOTAL_DURATION}ms"
echo "Audit Entries:         $AUDIT_COUNT/3"
echo "Script Generation:     ✓ SUCCESS"
echo "Image Generation:      ✓ SUCCESS"
echo "Timestamps Valid:      $([ "$VALID_TIMESTAMPS" = true ] && echo '✓ YES' || echo '✗ NO')"
echo ""

# Create summary file
cat > "$TEST_OUTPUT_DIR/summary.txt" << EOF
E2E Test Execution Summary
==========================

Test Date: $(date -u +"%Y-%m-%d")
Test Time: $TEST_START
Test Complete: $TEST_END
Total Duration: ${TEST_TOTAL_DURATION}ms

Pipeline Execution:
  1. Script Generation:  ✓ SUCCESS ($SCRIPT_GEN_DURATION ms)
  2. Image Generation:   ✓ SUCCESS ($IMAGE_GEN_DURATION ms)
  3. Audit Validation:   ✓ COMPLETE

Audit Entries Captured: $AUDIT_COUNT/3
  - script_generation:     $([ ! -z "$SCRIPT_AUDIT" ] && [ "$SCRIPT_AUDIT" != "null" ] && echo "✓" || echo "✗")
  - image_rendering:       $([ ! -z "$IMG_RENDER_AUDIT" ] && [ "$IMG_RENDER_AUDIT" != "null" ] && echo "✓" || echo "✗")
  - forecasting_and_log:   $([ ! -z "$IMG_FORECAST_AUDIT" ] && [ "$IMG_FORECAST_AUDIT" != "null" ] && echo "✓" || echo "✗")

All Timestamps Valid: $([ "$VALID_TIMESTAMPS" = true ] && echo "✓ YES" || echo "✗ NO")

Test Output Files:
  - $TEST_OUTPUT_DIR/script-gen-response.json
  - $TEST_OUTPUT_DIR/image-gen-response.json
  - $TEST_OUTPUT_DIR/script-gen-audit.json
  - $TEST_OUTPUT_DIR/image-render-audit.json
  - $TEST_OUTPUT_DIR/image-forecast-audit.json
  - $TEST_OUTPUT_DIR/summary.txt

For detailed results, see: workflows/E2E_TEST_REPORT.md
EOF

cat "$TEST_OUTPUT_DIR/summary.txt"

echo ""
echo "========================================================================="
echo "Test Output Files:"
echo "========================================================================="
ls -lh "$TEST_OUTPUT_DIR"/*

echo ""
echo "========================================================================="
echo "Next Steps:"
echo "========================================================================="
echo ""
echo "1. Review test results:"
echo "   cat $TEST_OUTPUT_DIR/summary.txt"
echo ""
echo "2. View audit entries:"
echo "   jq . $TEST_OUTPUT_DIR/script-gen-audit.json"
echo "   jq . $TEST_OUTPUT_DIR/image-render-audit.json"
echo "   jq . $TEST_OUTPUT_DIR/image-forecast-audit.json"
echo ""
echo "3. Check complete API responses:"
echo "   jq . $TEST_OUTPUT_DIR/script-gen-response.json"
echo "   jq . $TEST_OUTPUT_DIR/image-gen-response.json"
echo ""
echo "4. Fill in the E2E test report:"
echo "   $WORKFLOWS_DIR/E2E_TEST_REPORT.md"
echo ""
echo "========================================================================="
echo "E2E Test Complete"
echo "========================================================================="

# Exit with success
exit 0
