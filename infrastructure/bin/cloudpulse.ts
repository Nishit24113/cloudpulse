#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/storage-stack';
import { IngestionStack } from '../lib/ingestion-stack';
import { QueryStack } from '../lib/query-stack';
import { FrontendStack } from '../lib/frontend-stack';

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

// 1. Storage Layer (DynamoDB, Timestream, S3)
const storageStack = new StorageStack(app, 'CloudPulseStorageStack', {
  env,
  description: 'CloudPulse Storage Layer - DynamoDB, Timestream, S3',
  tags: {
    Project: 'CloudPulse',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
});

// 2. Ingestion Layer (API Gateway, Lambda, Kinesis)
const ingestionStack = new IngestionStack(app, 'CloudPulseIngestionStack', {
  env,
  description: 'CloudPulse Ingestion Layer - Metrics, Logs, Traces APIs',
  storageStack,
  tags: {
    Project: 'CloudPulse',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
});
ingestionStack.addDependency(storageStack);

// 3. Query Layer (FastAPI Lambda for querying)
const queryStack = new QueryStack(app, 'CloudPulseQueryStack', {
  env,
  description: 'CloudPulse Query Layer - Metrics and Logs Query APIs',
  storageStack,
  tags: {
    Project: 'CloudPulse',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
});
queryStack.addDependency(storageStack);

// 4. Frontend Layer (Next.js + CloudFront)
const frontendStack = new FrontendStack(app, 'CloudPulseFrontendStack', {
  env,
  description: 'CloudPulse Frontend - Next.js Dashboard + CloudFront',
  ingestionApiUrl: ingestionStack.apiUrl,
  queryApiUrl: queryStack.apiUrl,
  tags: {
    Project: 'CloudPulse',
    Environment: 'production',
    ManagedBy: 'CDK',
  },
});
frontendStack.addDependency(ingestionStack);
frontendStack.addDependency(queryStack);

app.synth();
