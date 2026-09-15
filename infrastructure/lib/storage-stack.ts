import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as timestream from 'aws-cdk-lib/aws-timestream';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class StorageStack extends cdk.Stack {
  public readonly metadataTable: dynamodb.Table;
  public readonly logsIndexTable: dynamodb.Table;
  public readonly alertsTable: dynamodb.Table;
  public readonly logsBucket: s3.Bucket;
  public readonly timestreamDatabase: timestream.CfnDatabase;
  public readonly metricsTable: timestream.CfnTable;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ===== DynamoDB Tables =====

    // 1. Metadata Table (users, orgs, dashboards, API keys)
    this.metadataTable = new dynamodb.Table(this, 'MetadataTable', {
      tableName: 'cloudpulse-metadata',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying by org_id
    this.metadataTable.addGlobalSecondaryIndex({
      indexName: 'OrgIndex',
      partitionKey: { name: 'org_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'created_at', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 2. Logs Index Table (for fast log queries before OpenSearch)
    this.logsIndexTable = new dynamodb.Table(this, 'LogsIndexTable', {
      tableName: 'cloudpulse-logs-index',
      partitionKey: { name: 'app_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl', // Auto-delete old logs after 30 days
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Logs can be recreated from S3
    });

    // GSI for querying by level (ERROR, WARN, INFO)
    this.logsIndexTable.addGlobalSecondaryIndex({
      indexName: 'LevelIndex',
      partitionKey: { name: 'app_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'level_timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 3. Alerts Table
    this.alertsTable = new dynamodb.Table(this, 'AlertsTable', {
      tableName: 'cloudpulse-alerts',
      partitionKey: { name: 'org_id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'alert_id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying active alerts
    this.alertsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'last_evaluated', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ===== Amazon Timestream (Time-series metrics) =====

    this.timestreamDatabase = new timestream.CfnDatabase(this, 'MetricsDatabase', {
      databaseName: 'cloudpulse_metrics',
    });

    this.metricsTable = new timestream.CfnTable(this, 'MetricsTable', {
      databaseName: this.timestreamDatabase.databaseName!,
      tableName: 'metrics',
      retentionProperties: {
        memoryStoreRetentionPeriodInHours: '24', // 24 hours in memory (fast queries)
        magneticStoreRetentionPeriodInDays: '90', // 90 days on disk (slower, cheaper)
      },
      magneticStoreWriteProperties: {
        enableMagneticStoreWrites: true,
      },
    });
    this.metricsTable.addDependency(this.timestreamDatabase);

    // ===== S3 Buckets =====

    // 1. Logs Archive Bucket (long-term storage)
    this.logsBucket = new s3.Bucket(this, 'LogsBucket', {
      bucketName: `cloudpulse-logs-${cdk.Aws.ACCOUNT_ID}-${cdk.Aws.REGION}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'TransitionToGlacier',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          expiration: cdk.Duration.days(365), // Delete after 1 year
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ===== Stack Outputs =====

    new cdk.CfnOutput(this, 'MetadataTableName', {
      value: this.metadataTable.tableName,
      description: 'DynamoDB Metadata Table Name',
      exportName: 'CloudPulse-MetadataTable',
    });

    new cdk.CfnOutput(this, 'LogsIndexTableName', {
      value: this.logsIndexTable.tableName,
      description: 'DynamoDB Logs Index Table Name',
      exportName: 'CloudPulse-LogsIndexTable',
    });

    new cdk.CfnOutput(this, 'AlertsTableName', {
      value: this.alertsTable.tableName,
      description: 'DynamoDB Alerts Table Name',
      exportName: 'CloudPulse-AlertsTable',
    });

    new cdk.CfnOutput(this, 'LogsBucketName', {
      value: this.logsBucket.bucketName,
      description: 'S3 Logs Bucket Name',
      exportName: 'CloudPulse-LogsBucket',
    });

    new cdk.CfnOutput(this, 'TimestreamDatabaseName', {
      value: this.timestreamDatabase.databaseName!,
      description: 'Timestream Database Name',
      exportName: 'CloudPulse-TimestreamDatabase',
    });

    new cdk.CfnOutput(this, 'TimestreamTableName', {
      value: this.metricsTable.tableName!,
      description: 'Timestream Metrics Table Name',
      exportName: 'CloudPulse-TimestreamTable',
    });
  }
}
