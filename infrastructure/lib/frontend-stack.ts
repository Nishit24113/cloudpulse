import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
  ingestionApiUrl: string;
  queryApiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // TODO: Will implement Next.js frontend + CloudFront in Phase 7
    // For now, just output the API URLs that will be used

    new cdk.CfnOutput(this, 'IngestionAPIForFrontend', {
      value: props.ingestionApiUrl,
      description: 'Ingestion API URL to be used by frontend',
    });

    new cdk.CfnOutput(this, 'QueryAPIForFrontend', {
      value: props.queryApiUrl,
      description: 'Query API URL to be used by frontend',
    });
  }
}
