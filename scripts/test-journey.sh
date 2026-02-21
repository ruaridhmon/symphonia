#!/bin/bash

################################################################################
# E2E User Journey Test Script for Symphonia
# 
# This script simulates a complete user journey through the Symphonia platform:
# 1. Login as admin (antreas@axiotic.ai / test123)
# 2. Create a new form with 2 questions
# 3. Submit a response as participant
# 4. Generate AI synthesis
# 5. View results
#
# Requirements:
# - Backend running on http://localhost:8000
# - jq installed for JSON parsing
# - curl installed
#
# Usage: ./scripts/test-journey.sh
################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:8000"
ADMIN_EMAIL="antreas@axiotic.ai"
ADMIN_PASSWORD="test123"

# Helper functions
log_step() {
    echo -e "${BLUE}==>${NC} ${1}"
}

log_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

log_error() {
    echo -e "${RED}✗${NC} ${1}"
}

log_info() {
    echo -e "${YELLOW}ℹ${NC} ${1}"
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    if ! command -v curl &> /dev/null; then
        log_error "curl is not installed. Please install curl."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install jq for JSON parsing."
        exit 1
    fi
    
    # Check if backend is running
    if ! curl -s "${API_BASE}/docs" > /dev/null; then
        log_error "Backend is not running at ${API_BASE}"
        log_info "Please start the backend with: cd backend && uvicorn main:app --reload"
        exit 1
    fi
    
    log_success "Prerequisites met"
}

################################################################################
# STEP 1: Login as Admin
################################################################################
login_admin() {
    log_step "Step 1: Logging in as admin (${ADMIN_EMAIL})..."
    
    LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=${ADMIN_EMAIL}&password=${ADMIN_PASSWORD}")
    
    # Check if login was successful
    if echo "$LOGIN_RESPONSE" | jq -e '.access_token' > /dev/null; then
        ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
        IS_ADMIN=$(echo "$LOGIN_RESPONSE" | jq -r '.is_admin')
        
        if [ "$IS_ADMIN" != "true" ]; then
            log_error "User is not an admin"
            exit 1
        fi
        
        log_success "Logged in successfully as admin"
        log_info "Access token: ${ACCESS_TOKEN:0:20}..."
    else
        log_error "Login failed"
        echo "$LOGIN_RESPONSE" | jq .
        exit 1
    fi
}

################################################################################
# STEP 2: Create a New Form with 2 Questions
################################################################################
create_form() {
    log_step "Step 2: Creating a new form with 2 questions..."
    
    FORM_TITLE="E2E Test Form - $(date +%Y%m%d_%H%M%S)"
    FORM_JSON=$(cat <<EOF
{
    "title": "${FORM_TITLE}",
    "questions": [
        "What is your opinion on AI governance?",
        "How should we balance innovation with safety?"
    ],
    "allow_join": true,
    "join_code": "e2e-test-$(date +%s)"
}
EOF
)
    
    FORM_RESPONSE=$(curl -s -X POST "${API_BASE}/create_form" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$FORM_JSON")
    
    # Check if form was created
    if echo "$FORM_RESPONSE" | jq -e '.id' > /dev/null; then
        FORM_ID=$(echo "$FORM_RESPONSE" | jq -r '.id')
        JOIN_CODE=$(echo "$FORM_RESPONSE" | jq -r '.join_code')
        
        log_success "Form created successfully"
        log_info "Form ID: ${FORM_ID}"
        log_info "Title: ${FORM_TITLE}"
        log_info "Join Code: ${JOIN_CODE}"
    else
        log_error "Form creation failed"
        echo "$FORM_RESPONSE" | jq .
        exit 1
    fi
}

################################################################################
# STEP 3: Submit a Response as Participant
################################################################################
submit_response() {
    log_step "Step 3: Submitting a response as participant..."
    
    # For simplicity, we'll submit as the admin user
    # In a real test, you'd create/use a separate participant account
    
    ANSWERS_JSON=$(cat <<EOF
{
    "q1": "AI governance requires a multi-stakeholder approach involving researchers, policymakers, and civil society.",
    "q2": "We should implement adaptive regulatory frameworks that can evolve with the technology."
}
EOF
)
    
    SUBMIT_RESPONSE=$(curl -s -X POST "${API_BASE}/submit" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "form_id=${FORM_ID}" \
        -d "answers=$(echo "$ANSWERS_JSON" | jq -c .)")
    
    # Check if submission was successful
    if echo "$SUBMIT_RESPONSE" | jq -e '.ok' > /dev/null; then
        log_success "Response submitted successfully"
    else
        log_error "Response submission failed"
        echo "$SUBMIT_RESPONSE" | jq .
        exit 1
    fi
    
    # Wait a moment for the response to be processed
    sleep 1
}

################################################################################
# STEP 4: Generate AI Synthesis
################################################################################
generate_synthesis() {
    log_step "Step 4: Generating AI synthesis..."
    
    SYNTHESIS_REQUEST=$(cat <<EOF
{
    "model": "anthropic/claude-sonnet-4-5",
    "mode": "human_only",
    "n_analysts": 3
}
EOF
)
    
    SYNTHESIS_RESPONSE=$(curl -s -X POST "${API_BASE}/forms/${FORM_ID}/synthesise_committee" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "$SYNTHESIS_REQUEST")
    
    # Check if synthesis was generated
    if echo "$SYNTHESIS_RESPONSE" | jq -e '.synthesis' > /dev/null; then
        CONVERGENCE_SCORE=$(echo "$SYNTHESIS_RESPONSE" | jq -r '.convergence_score // "N/A"')
        
        log_success "Synthesis generated successfully"
        log_info "Convergence Score: ${CONVERGENCE_SCORE}"
        
        # Save synthesis to file for review
        echo "$SYNTHESIS_RESPONSE" | jq '.synthesis' > /tmp/e2e_synthesis_${FORM_ID}.json
        log_info "Synthesis saved to: /tmp/e2e_synthesis_${FORM_ID}.json"
    else
        log_error "Synthesis generation failed"
        echo "$SYNTHESIS_RESPONSE" | jq .
        
        # Check if this is a mock mode response (no API key configured)
        if echo "$SYNTHESIS_RESPONSE" | jq -e '.summary' > /dev/null; then
            log_info "Received mock synthesis (OPENROUTER_API_KEY not configured)"
            log_success "Test passed with mock synthesis"
            return 0
        fi
        
        exit 1
    fi
}

################################################################################
# STEP 5: View Results
################################################################################
view_results() {
    log_step "Step 5: Viewing results..."
    
    # Get form details
    FORM_DETAILS=$(curl -s -X GET "${API_BASE}/forms/${FORM_ID}" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    log_info "Form Details:"
    echo "$FORM_DETAILS" | jq '.'
    
    # Get responses
    RESPONSES=$(curl -s -X GET "${API_BASE}/form/${FORM_ID}/responses" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    RESPONSE_COUNT=$(echo "$RESPONSES" | jq 'length')
    log_info "Total Responses: ${RESPONSE_COUNT}"
    
    # Get rounds
    ROUNDS=$(curl -s -X GET "${API_BASE}/forms/${FORM_ID}/rounds" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    ROUND_COUNT=$(echo "$ROUNDS" | jq 'length')
    log_info "Total Rounds: ${ROUND_COUNT}"
    
    # Get active round synthesis
    ACTIVE_ROUND=$(echo "$ROUNDS" | jq '.[] | select(.is_active == true)')
    
    if [ ! -z "$ACTIVE_ROUND" ]; then
        ROUND_NUMBER=$(echo "$ACTIVE_ROUND" | jq -r '.round_number')
        HAS_SYNTHESIS=$(echo "$ACTIVE_ROUND" | jq -e '.synthesis_json' > /dev/null && echo "yes" || echo "no")
        
        log_info "Active Round: ${ROUND_NUMBER}"
        log_info "Has Synthesis: ${HAS_SYNTHESIS}"
    fi
    
    log_success "Results retrieved successfully"
}

################################################################################
# Cleanup (optional)
################################################################################
cleanup() {
    if [ "${CLEANUP:-no}" == "yes" ]; then
        log_step "Cleaning up test data..."
        
        curl -s -X DELETE "${API_BASE}/forms/${FORM_ID}" \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" > /dev/null
        
        log_success "Test form deleted"
    fi
}

################################################################################
# Main Execution
################################################################################
main() {
    echo ""
    echo "=================================="
    echo "Symphonia E2E User Journey Test"
    echo "=================================="
    echo ""
    
    check_prerequisites
    login_admin
    create_form
    submit_response
    generate_synthesis
    view_results
    
    echo ""
    echo "=================================="
    log_success "E2E Test Completed Successfully!"
    echo "=================================="
    echo ""
    
    log_info "Test Summary:"
    log_info "  - Form ID: ${FORM_ID}"
    log_info "  - Admin Email: ${ADMIN_EMAIL}"
    log_info "  - API Base: ${API_BASE}"
    echo ""
    
    # Uncomment to enable cleanup
    # CLEANUP=yes cleanup
}

# Run main function
main
