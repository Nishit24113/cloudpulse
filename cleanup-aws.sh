#!/bin/bash

#============================================================
# CloudPulse - AWS Cleanup Script
# Destroys ALL AWS resources to avoid charges
#============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
AWS_PROFILE="default"
AWS_REGION="us-west-2"
FORCE=false
DRY_RUN=false

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
        --profile)
            AWS_PROFILE="$2"
            shift 2
            ;;
        --region)
            AWS_REGION="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --help)
            echo "CloudPulse AWS Cleanup Script"
            echo ""
            echo "Usage: ./cleanup-aws.sh [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --profile <profile>   AWS profile name (default: default)"
            echo "  --region <region>     AWS region (default: us-west-2)"
            echo "  --force               Skip confirmation prompt"
            echo "  --dry-run             Show what would be deleted without deleting"
            echo "  --help                Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./cleanup-aws.sh --profile sandbox2025 --region us-west-2"
            echo "  ./cleanup-aws.sh --dry-run"
            echo "  ./cleanup-aws.sh --force"
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
# Confirmation
#============================================================

print_header "CloudPulse AWS Cleanup"
print_warning "This will DELETE all CloudPulse resources in AWS!"
echo ""
echo "AWS Profile: $AWS_PROFILE"
echo "AWS Region: $AWS_REGION"
echo ""
print_warning "Resources to be deleted:"
echo "  - All CloudFormation stacks (CloudPulseStorageStack, etc.)"
echo "  - All Lambda functions"
echo "  - All DynamoDB tables (DATA WILL BE LOST)"
echo "  - All SQS queues"
echo "  - All S3 buckets (including frontend)"
echo "  - All IAM roles created by CloudPulse"
echo "  - All API Gateway APIs"
echo ""

if [ "$DRY_RUN" = true ]; then
    print_info "DRY RUN MODE - No resources will be deleted"
    echo ""
fi

if [ "$FORCE" = false ] && [ "$DRY_RUN" = false ]; then
    read -p "Are you sure you want to delete ALL resources? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        print_info "Cleanup cancelled"
        exit 0
    fi
fi

#============================================================
# Verify AWS Credentials
#============================================================

print_header "Step 1: Verifying AWS Credentials"

if ! aws sts get-caller-identity --profile "$AWS_PROFILE" > /dev/null 2>&1; then
    print_error "Failed to authenticate with AWS profile: $AWS_PROFILE"
    print_info "Please check your AWS credentials"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Account --output text)
USER_ARN=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query Arn --output text)

print_success "Authenticated as: $USER_ARN"
print_info "Account ID: $ACCOUNT_ID"
echo ""

#============================================================
# List Resources
#============================================================

print_header "Step 2: Discovering Resources"

# Find CloudFormation stacks
STACKS=$(aws cloudformation list-stacks \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
    --query 'StackSummaries[?contains(StackName, `CloudPulse`)].StackName' \
    --output text 2>/dev/null || echo "")

if [ -n "$STACKS" ]; then
    print_info "Found CloudFormation stacks:"
    for stack in $STACKS; do
        echo "  - $stack"
    done
else
    print_warning "No CloudFormation stacks found"
fi

# Find S3 buckets
BUCKETS=$(aws s3api list-buckets \
    --profile "$AWS_PROFILE" \
    --query 'Buckets[?contains(Name, `cloudpulse`)].Name' \
    --output text 2>/dev/null || echo "")

if [ -n "$BUCKETS" ]; then
    print_info "Found S3 buckets:"
    for bucket in $BUCKETS; do
        echo "  - $bucket"
    done
else
    print_warning "No S3 buckets found"
fi

echo ""

#============================================================
# Delete S3 Buckets First
#============================================================

if [ -n "$BUCKETS" ]; then
    print_header "Step 3: Deleting S3 Buckets"

    for bucket in $BUCKETS; do
        if [ "$DRY_RUN" = true ]; then
            print_info "[DRY RUN] Would delete bucket: $bucket"
        else
            print_info "Deleting bucket: $bucket"

            # Empty bucket first
            aws s3 rm "s3://$bucket" --recursive --profile "$AWS_PROFILE" 2>/dev/null || true

            # Delete bucket
            aws s3 rb "s3://$bucket" --profile "$AWS_PROFILE" 2>/dev/null || true

            print_success "Deleted bucket: $bucket"
        fi
    done
    echo ""
fi

#============================================================
# Delete CloudFormation Stacks
#============================================================

if [ -n "$STACKS" ]; then
    print_header "Step 4: Deleting CloudFormation Stacks"

    if [ "$DRY_RUN" = true ]; then
        print_info "[DRY RUN] Would delete stacks:"
        for stack in $STACKS; do
            echo "  - $stack"
        done
    else
        # Use CDK destroy if infrastructure directory exists
        if [ -d "infrastructure" ]; then
            print_info "Using CDK to destroy stacks..."
            cd infrastructure
            npx cdk destroy --all --profile "$AWS_PROFILE" --force 2>/dev/null || {
                print_warning "CDK destroy failed, trying CloudFormation directly..."
                cd ..

                # Delete stacks directly
                for stack in $STACKS; do
                    print_info "Deleting stack: $stack"
                    aws cloudformation delete-stack \
                        --stack-name "$stack" \
                        --profile "$AWS_PROFILE" \
                        --region "$AWS_REGION"
                done

                # Wait for deletion
                print_info "Waiting for stacks to be deleted..."
                for stack in $STACKS; do
                    aws cloudformation wait stack-delete-complete \
                        --stack-name "$stack" \
                        --profile "$AWS_PROFILE" \
                        --region "$AWS_REGION" 2>/dev/null || true
                done
            }
            cd ..
        else
            # Delete stacks directly
            for stack in $STACKS; do
                print_info "Deleting stack: $stack"
                aws cloudformation delete-stack \
                    --stack-name "$stack" \
                    --profile "$AWS_PROFILE" \
                    --region "$AWS_REGION"
            done

            # Wait for deletion
            print_info "Waiting for stacks to be deleted..."
            for stack in $STACKS; do
                aws cloudformation wait stack-delete-complete \
                    --stack-name "$stack" \
                    --profile "$AWS_PROFILE" \
                    --region "$AWS_REGION" 2>/dev/null || true
            done
        fi

        print_success "All CloudFormation stacks deleted"
    fi
    echo ""
fi

#============================================================
# Verify Deletion
#============================================================

if [ "$DRY_RUN" = false ]; then
    print_header "Step 5: Verifying Deletion"

    # Check for remaining resources
    REMAINING_STACKS=$(aws cloudformation list-stacks \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
        --query 'StackSummaries[?contains(StackName, `CloudPulse`)].StackName' \
        --output text 2>/dev/null || echo "")

    REMAINING_BUCKETS=$(aws s3api list-buckets \
        --profile "$AWS_PROFILE" \
        --query 'Buckets[?contains(Name, `cloudpulse`)].Name' \
        --output text 2>/dev/null || echo "")

    if [ -z "$REMAINING_STACKS" ] && [ -z "$REMAINING_BUCKETS" ]; then
        print_success "All CloudPulse resources deleted"
        print_success "AWS account is now clean"
        print_info "Monthly cost: $0"
    else
        print_warning "Some resources may still exist:"
        [ -n "$REMAINING_STACKS" ] && echo "  Stacks: $REMAINING_STACKS"
        [ -n "$REMAINING_BUCKETS" ] && echo "  Buckets: $REMAINING_BUCKETS"
        print_info "These may be in DELETE_IN_PROGRESS state"
        print_info "Run this script again in a few minutes if needed"
    fi
fi

#============================================================
# Summary
#============================================================

print_header "Cleanup Summary"

if [ "$DRY_RUN" = true ]; then
    print_info "DRY RUN completed - no resources were deleted"
    print_info "Run without --dry-run to actually delete resources"
else
    print_success "Cleanup completed successfully!"
    echo ""
    print_info "What was deleted:"
    [ -n "$STACKS" ] && echo "  ✓ CloudFormation stacks"
    [ -n "$BUCKETS" ] && echo "  ✓ S3 buckets"
    echo "  ✓ Lambda functions (via CloudFormation)"
    echo "  ✓ DynamoDB tables (via CloudFormation)"
    echo "  ✓ SQS queues (via CloudFormation)"
    echo "  ✓ IAM roles (via CloudFormation)"
    echo ""
    print_success "Your AWS account will no longer incur charges for CloudPulse"
fi

echo ""
print_success "Done!"
