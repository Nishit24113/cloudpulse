import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StorageStack } from './storage-stack';

export interface QueryStackProps extends cdk.StackProps {
  storageStack: StorageStack;
}

export class QueryStack extends cdk.Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: QueryStackProps) {
    super(scope, id, props);

    // TODO: Will implement FastAPI query endpoints in Phase 4
    // For now, set a placeholder
    this.apiUrl = 'https://query-api.placeholder.com/';

    new cdk.CfnOutput(this, 'QueryAPIUrl', {
      value: this.apiUrl,
      description: 'CloudPulse Query API URL (placeholder)',
    });
  }
}
