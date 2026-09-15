#!/bin/bash

##############################################################################
# CloudPulse - One-Click Deployment Script
#
# This script deploys the complete CloudPulse observability platform to AWS
#
# Prerequisites:
#   - AWS CLI configured with credentials
#   - Node.js 18+ (for CDK)
#   - Python 3.12+ (for Lambda functions)
#   - Go 1.22+ (for Go Lambda functions)
#   - Docker (for building Lambda layers)
#
# Usage:
#   ./deploy.sh [options]
#
# Options:
#   --profile PROFILE    AWS CLI profile to use (default: default)
#   --region REGION      AWS region (default: us-east-1)
#   --skip-frontend      Skip frontend deployment
#   --skip-build         Skip building Lambda functions
#   --destroy            Destroy all resources instead of deploying
#   --help               Show this help message
#
##############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
AWS_PROFILE="default"
AWS_REGION="us-east-1"
SKIP_FRONTEND=false
SKIP_BUILD=false
DESTROY_MODE=false
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --skip-frontend)
            SKIP_FRONTEND=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --destroy)
            DESTROY_MODE=true
            shift
            ;;
        --help)
            grep '^#' "$0" | grep -v '#!/bin/bash' | sed 's/^# \?//'
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

##############################################################################
# Helper Functions
##############################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI first."
        exit 1
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+ first."
        exit 1
    fi

    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 not found. Please install Python 3.12+ first."
        exit 1
    fi

    # Check Go (optional, will skip Go builds if not present)
    if ! command -v go &> /dev/null; then
        log_warning "Go not found. Will skip Go Lambda builds."
        SKIP_GO_BUILD=true
    else
        SKIP_GO_BUILD=false
    fi

    # Verify AWS credentials
    if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
        log_error "AWS credentials not configured for profile: $AWS_PROFILE"
        exit 1
    fi

    log_success "Prerequisites check passed!"
}

##############################################################################
# Build Functions
##############################################################################

build_python_lambdas() {
    log_info "Building Python Lambda functions..."

    # Metrics Ingestion (Python fallback)
    log_info "  Building metrics-api (Python)..."
    cd "$PROJECT_ROOT/services/ingestion/metrics-api"
    # Dependencies are already in the Lambda code
    log_success "  Metrics API ready"

    # Logs Ingestion
    log_info "  Building logs-api (Python)..."
    cd "$PROJECT_ROOT/services/ingestion/logs-api"
    log_success "  Logs API ready"

    # Metrics Processor
    log_info "  Building metrics-processor (Python)..."
    cd "$PROJECT_ROOT/services/processing/metrics-processor"
    log_success "  Metrics Processor ready"

    log_success "Python Lambda functions built successfully!"
}

build_go_lambdas() {
    if [ "$SKIP_GO_BUILD" = true ]; then
        log_warning "Skipping Go Lambda builds (Go not installed)"
        return
    fi

    log_info "Building Go Lambda functions..."

    # Metrics Ingestion (Go - high performance)
    log_info "  Building metrics-api-go..."
    cd "$PROJECT_ROOT/services/ingestion/metrics-api-go"

    if [ -f "go.mod" ]; then
        GOOS=linux GOARCH=arm64 go build -tags lambda.norpc -o bootstrap main.go
        zip -q function.zip bootstrap
        log_success "  Metrics API (Go) built successfully"
    else
        log_warning "  go.mod not found, skipping Go build"
    fi

    log_success "Go Lambda functions built!"
}

build_frontend() {
    if [ "$SKIP_FRONTEND" = true ]; then
        log_info "Skipping frontend build..."
        return
    fi

    log_info "Building frontend dashboards..."

    # TODO: Will be implemented in Phase 7
    log_warning "Frontend deployment not yet implemented (Phase 7)"

    # cd "$PROJECT_ROOT/frontend"
    # npm install
    # npm run build

    log_info "Frontend build complete (placeholder)"
}

##############################################################################
# CDK Deployment Functions
##############################################################################

deploy_infrastructure() {
    log_info "Deploying CloudPulse infrastructure to AWS..."

    cd "$PROJECT_ROOT/infrastructure"

    # Install CDK dependencies
    log_info "Installing CDK dependencies..."
    npm install

    # Bootstrap CDK (if not already done)
    log_info "Bootstrapping CDK..."
    npx cdk bootstrap \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        aws://$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)/"$AWS_REGION" \
        || log_warning "CDK already bootstrapped"

    # Synthesize CloudFormation templates
    log_info "Synthesizing CDK stacks..."
    npx cdk synth --profile "$AWS_PROFILE"

    # Deploy all stacks
    log_info "Deploying CDK stacks..."
    npx cdk deploy --all \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --require-approval never

    log_success "Infrastructure deployed successfully!"

    # Extract outputs
    log_info "Extracting deployment outputs..."
    INGESTION_API_URL=$(aws cloudformation describe-stacks \
        --stack-name CloudPulseIngestionStack \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='IngestionAPIUrl'].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [ -n "$INGESTION_API_URL" ]; then
        log_success "Ingestion API URL: $INGESTION_API_URL"
    fi
}

destroy_infrastructure() {
    log_warning "DESTROYING CloudPulse infrastructure..."

    read -p "Are you sure you want to destroy all CloudPulse resources? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Destroy cancelled."
        exit 0
    fi

    cd "$PROJECT_ROOT/infrastructure"

    log_info "Destroying all CDK stacks..."
    npx cdk destroy --all \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --force

    log_success "Infrastructure destroyed successfully!"
}

##############################################################################
# Testing Functions
##############################################################################

test_deployment() {
    log_info "Testing CloudPulse deployment..."

    # Get API URL
    INGESTION_API_URL=$(aws cloudformation describe-stacks \
        --stack-name CloudPulseIngestionStack \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query "Stacks[0].Outputs[?OutputKey=='IngestionAPIUrl'].OutputValue" \
        --output text 2>/dev/null || echo "")

    if [ -z "$INGESTION_API_URL" ]; then
        log_error "Could not retrieve Ingestion API URL"
        return 1
    fi

    # Test health endpoint
    log_info "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s "${INGESTION_API_URL}health")
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        log_success "Health check passed!"
    else
        log_error "Health check failed: $HEALTH_RESPONSE"
        return 1
    fi

    # Test metrics ingestion
    log_info "Testing metrics ingestion..."
    METRICS_RESPONSE=$(curl -s -X POST "${INGESTION_API_URL}metrics" \
        -H "Content-Type: application/json" \
        -d '{
            "metrics": [
                {
                    "metric": "test.deployment",
                    "value": 1.0,
                    "app_id": "cloudpulse-test",
                    "tags": {"source": "deployment-script"}
                }
            ]
        }')

    if echo "$METRICS_RESPONSE" | grep -q "accepted"; then
        log_success "Metrics ingestion test passed!"
    else
        log_error "Metrics ingestion test failed: $METRICS_RESPONSE"
        return 1
    fi

    log_success "All deployment tests passed!"
}

##############################################################################
# Main Deployment Flow
##############################################################################

main() {
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              CloudPulse - One-Click Deployment                ║"
    echo "║                                                               ║"
    echo "║     Universal Observability Platform for AWS                 ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    log_info "Deployment Configuration:"
    log_info "  AWS Profile: $AWS_PROFILE"
    log_info "  AWS Region: $AWS_REGION"
    log_info "  Project Root: $PROJECT_ROOT"
    echo

    if [ "$DESTROY_MODE" = true ]; then
        destroy_infrastructure
        exit 0
    fi

    # Step 1: Check prerequisites
    check_prerequisites
    echo

    # Step 2: Build Lambda functions
    if [ "$SKIP_BUILD" = false ]; then
        build_python_lambdas
        echo
        build_go_lambdas
        echo
        build_frontend
        echo
    else
        log_info "Skipping build step..."
        echo
    fi

    # Step 3: Deploy infrastructure
    deploy_infrastructure
    echo

    # Step 4: Test deployment
    test_deployment
    echo

    # Success summary
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║                  🎉 DEPLOYMENT SUCCESSFUL! 🎉                 ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    log_success "CloudPulse is now running on AWS!"
    echo
    log_info "Next Steps:"
    log_info "1. Check your API endpoints in AWS CloudFormation outputs"
    log_info "2. Install the Python SDK: cd sdks/python && pip install -e ."
    log_info "3. Test with your application: See docs/integration-guide.md"
    echo
    log_info "To view CloudFormation outputs:"
    echo "  aws cloudformation describe-stacks --stack-name CloudPulseIngestionStack --profile $AWS_PROFILE"
    echo
    log_info "To destroy all resources:"
    echo "  ./deploy.sh --destroy --profile $AWS_PROFILE"
    echo
}

# Run main deployment
main
