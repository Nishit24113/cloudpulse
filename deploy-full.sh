#!/bin/bash

#============================================================
# CloudPulse - Unified Deployment Script
# Deploys both Backend (AWS CDK) + Frontend (S3/CloudFront)
#============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DEPLOYMENT_MODE="full-aws"  # full-aws, backend-only, local-with-aws, local-only
AWS_PROFILE="default"
AWS_REGION="us-east-1"
DESTROY=false
SKIP_TESTS=false

#============================================================
# Helper Functions
#============================================================

print_header() {
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

#============================================================
# Parse Arguments
#============================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            DEPLOYMENT_MODE="$2"
            shift 2
            ;;
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --destroy)
            DESTROY=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --help)
            echo "CloudPulse Deployment Script"
            echo ""
            echo "Usage: ./deploy-full.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --mode <mode>         Deployment mode (default: full-aws)"
            echo "                        Modes:"
            echo "                        - full-aws: Deploy backend + frontend to AWS"
            echo "                        - backend-only: Deploy only backend to AWS"
            echo "                        - local-with-aws: Run locally with AWS services"
            echo "                        - local-only: Run everything locally (limited features)"
            echo "  --profile <profile>   AWS profile name (default: default)"
            echo "  --region <region>     AWS region (default: us-east-1)"
            echo "  --destroy             Destroy all resources"
            echo "  --skip-tests          Skip post-deployment tests"
            echo "  --help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./deploy-full.sh --mode full-aws --profile sandbox2025 --region us-west-2"
            echo "  ./deploy-full.sh --mode backend-only --profile prod"
            echo "  ./deploy-full.sh --destroy --profile sandbox2025"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

#============================================================
# Destroy Resources
#============================================================

if [ "$DESTROY" = true ]; then
    print_header "Destroying CloudPulse Resources"

    print_info "Destroying backend resources..."
    cd infrastructure
    cdk destroy --all --profile "$AWS_PROFILE" --force
    cd ..

    print_success "All resources destroyed"
    print_info "Cost is now $0"
    exit 0
fi

#============================================================
# Deployment Mode: Full AWS
#============================================================

if [ "$DEPLOYMENT_MODE" = "full-aws" ]; then
    print_header "CloudPulse Full AWS Deployment"
    print_info "Mode: Backend + Frontend on AWS"
    print_info "Profile: $AWS_PROFILE"
    print_info "Region: $AWS_REGION"
    echo ""

    # Step 1: Deploy Backend
    print_header "Step 1/3: Deploying Backend Infrastructure"
    cd infrastructure

    print_info "Installing CDK dependencies..."
    npm install

    print_info "Compiling TypeScript..."
    node ./node_modules/typescript/bin/tsc

    print_info "Bootstrapping CDK..."
    cdk bootstrap --profile "$AWS_PROFILE"

    print_info "Deploying backend stacks..."
    cdk deploy --all --profile "$AWS_PROFILE" --require-approval never

    # Get API URL from CDK output
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name CloudPulseIngestionStack \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`IngestionAPIUrl`].OutputValue' \
        --output text)

    print_success "Backend deployed successfully"
    print_info "API URL: $API_URL"
    cd ..

    # Step 2: Build Frontend
    print_header "Step 2/3: Building Frontend Dashboard"
    cd dashboard

    print_info "Installing frontend dependencies..."
    npm install

    # Update API URL in frontend
    print_info "Configuring API endpoint..."
    cat > src/config.js << EOF
export const API_BASE_URL = '${API_URL}'
EOF

    # Update api.js to use config
    sed -i "s|const API_BASE_URL = '.*'|import { API_BASE_URL } from './config'|g" src/utils/api.js || true

    print_info "Building production bundle..."
    npm run build

    print_success "Frontend built successfully"
    cd ..

    # Step 3: Deploy Frontend to S3
    print_header "Step 3/3: Deploying Frontend to S3"

    BUCKET_NAME="cloudpulse-dashboard-$(date +%s)"

    print_info "Creating S3 bucket: $BUCKET_NAME"
    aws s3 mb "s3://$BUCKET_NAME" --profile "$AWS_PROFILE" --region "$AWS_REGION"

    print_info "Configuring bucket for static website hosting..."
    aws s3 website "s3://$BUCKET_NAME" \
        --index-document index.html \
        --profile "$AWS_PROFILE"

    print_info "Setting bucket policy for public read..."
    cat > /tmp/bucket-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
        }
    ]
}
EOF
    aws s3api put-bucket-policy \
        --bucket "$BUCKET_NAME" \
        --policy file:///tmp/bucket-policy.json \
        --profile "$AWS_PROFILE"

    print_info "Uploading frontend files..."
    aws s3 sync dashboard/dist "s3://$BUCKET_NAME" \
        --profile "$AWS_PROFILE" \
        --delete

    WEBSITE_URL="http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"

    print_success "Frontend deployed successfully"
    echo ""
    print_header "Deployment Complete!"
    print_success "Backend API: $API_URL"
    print_success "Frontend Dashboard: $WEBSITE_URL"
    echo ""
    print_info "Test your deployment:"
    echo "  1. Open: $WEBSITE_URL"
    echo "  2. Navigate to 'Send Test Data'"
    echo "  3. Send a test metric"
    echo "  4. Check DynamoDB for data"
    echo ""
    print_info "Estimated cost: \$0-2/month (with AWS Free Tier)"
    echo ""

    # Save deployment info
    cat > DEPLOYMENT_INFO.txt << EOF
CloudPulse Deployment Information
================================

Deployment Mode: Full AWS
AWS Profile: $AWS_PROFILE
AWS Region: $AWS_REGION
Deployed: $(date)

Backend API: $API_URL
Frontend Dashboard: $WEBSITE_URL
S3 Bucket: $BUCKET_NAME

To destroy resources:
./deploy-full.sh --destroy --profile $AWS_PROFILE

Cost: \$0-2/month (with Free Tier)
EOF

    print_success "Deployment info saved to DEPLOYMENT_INFO.txt"
fi

#============================================================
# Deployment Mode: Backend Only
#============================================================

if [ "$DEPLOYMENT_MODE" = "backend-only" ]; then
    print_header "CloudPulse Backend-Only Deployment"
    print_info "Mode: Backend on AWS, Frontend runs locally"
    print_info "Profile: $AWS_PROFILE"
    print_info "Region: $AWS_REGION"
    echo ""

    # Deploy Backend
    print_info "Deploying backend infrastructure..."
    cd infrastructure
    npm install
    node ./node_modules/typescript/bin/tsc
    cdk bootstrap --profile "$AWS_PROFILE"
    cdk deploy --all --profile "$AWS_PROFILE" --require-approval never

    # Get API URL
    API_URL=$(aws cloudformation describe-stacks \
        --stack-name CloudPulseIngestionStack \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`IngestionAPIUrl`].OutputValue' \
        --output text)

    cd ..

    print_success "Backend deployed successfully"
    echo ""
    print_header "Deployment Complete!"
    print_success "Backend API: $API_URL"
    echo ""
    print_info "To run frontend locally:"
    echo "  1. cd dashboard"
    echo "  2. Update src/utils/api.js with API URL: $API_URL"
    echo "  3. npm install"
    echo "  4. node ./node_modules/vite/bin/vite.js"
    echo "  5. Open http://localhost:3000"
    echo ""
fi

#============================================================
# Deployment Mode: Local with AWS
#============================================================

if [ "$DEPLOYMENT_MODE" = "local-with-aws" ]; then
    print_header "CloudPulse Local Deployment (with AWS Services)"
    print_info "Mode: Local backend + frontend, using AWS services"
    echo ""

    print_warning "This mode requires:"
    echo "  - AWS credentials configured"
    echo "  - DynamoDB tables created manually"
    echo "  - SQS queues created manually"
    echo ""
    print_info "Features available:"
    echo "  ✅ Frontend dashboard"
    echo "  ✅ Backend API (local)"
    echo "  ✅ DynamoDB storage"
    echo "  ⚠️  No Lambda functions (manual triggers)"
    echo ""
    print_info "To set up:"
    echo "  1. Deploy backend: --mode backend-only"
    echo "  2. Run frontend locally"
    echo "  3. Update API URL in frontend to localhost"
    echo ""
fi

#============================================================
# Deployment Mode: Local Only
#============================================================

if [ "$DEPLOYMENT_MODE" = "local-only" ]; then
    print_header "CloudPulse Local-Only Deployment"
    print_info "Mode: Everything runs locally (no AWS)"
    echo ""

    print_warning "Limited features in this mode:"
    echo "  ✅ Frontend dashboard UI"
    echo "  ✅ Mock data visualization"
    echo "  ❌ No real metrics storage"
    echo "  ❌ No AWS Lambda functions"
    echo "  ❌ No real-time processing"
    echo ""
    print_info "To run:"
    echo "  1. cd dashboard"
    echo "  2. npm install"
    echo "  3. node ./node_modules/vite/bin/vite.js"
    echo "  4. Open http://localhost:3000"
    echo ""
    print_info "Frontend will use mock data for demonstration"
    echo ""
fi

print_success "Deployment script completed!"
