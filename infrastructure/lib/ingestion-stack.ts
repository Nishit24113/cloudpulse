import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { StorageStack } from './storage-stack';

export interface IngestionStackProps extends cdk.StackProps {
  storageStack: StorageStack;
}

export class IngestionStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly metricsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: IngestionStackProps) {
    super(scope, id, props);

    const { storageStack } = props;

    // ===== SQS Queue (FREE tier alternative to Kinesis) =====

    this.metricsQueue = new sqs.Queue(this, 'MetricsQueue', {
      queueName: 'cloudpulse-metrics-queue',
      retentionPeriod: cdk.Duration.days(4),
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    const logsQueue = new sqs.Queue(this, 'LogsQueue', {
      queueName: 'cloudpulse-logs-queue',
      retentionPeriod: cdk.Duration.days(4),
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    // ===== Lambda Functions =====

    // 1. Metrics Ingestion Lambda (Python for MVP, will be Go later)
    const metricsIngestionLambda = new lambda.Function(this, 'MetricsIngestionLambda', {
      functionName: 'cloudpulse-metrics-ingestion',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('../services/ingestion/metrics-api'),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        METRICS_QUEUE_URL: this.metricsQueue.queueUrl,
        TIMESTREAM_DATABASE: storageStack.timestreamDatabase.databaseName!,
        TIMESTREAM_TABLE: storageStack.metricsTable.tableName!,
      },
    });

    // Grant permissions
    this.metricsQueue.grantSendMessages(metricsIngestionLambda);

    // Grant Timestream write permissions
    metricsIngestionLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'timestream:WriteRecords',
        'timestream:DescribeEndpoints',
      ],
      resources: [
        `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${storageStack.timestreamDatabase.databaseName}`,
        `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${storageStack.timestreamDatabase.databaseName}/table/${storageStack.metricsTable.tableName}`,
      ],
    }));

    // 2. Logs Ingestion Lambda
    const logsIngestionLambda = new lambda.Function(this, 'LogsIngestionLambda', {
      functionName: 'cloudpulse-logs-ingestion',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('../services/ingestion/logs-api'),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        LOGS_QUEUE_URL: logsQueue.queueUrl,
        LOGS_INDEX_TABLE: storageStack.logsIndexTable.tableName,
        LOGS_BUCKET: storageStack.logsBucket.bucketName,
      },
    });

    // Grant permissions
    logsQueue.grantSendMessages(logsIngestionLambda);
    storageStack.logsIndexTable.grantWriteData(logsIngestionLambda);
    storageStack.logsBucket.grantWrite(logsIngestionLambda);

    // ===== API Gateway =====

    const api = new apigateway.RestApi(this, 'IngestionAPI', {
      restApiName: 'CloudPulse Ingestion API',
      description: 'Universal metrics, logs, and traces ingestion',
      deployOptions: {
        stageName: 'v1',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['POST', 'GET', 'OPTIONS'],
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // POST /v1/metrics
    const metricsResource = api.root.addResource('metrics');
    metricsResource.addMethod('POST', new apigateway.LambdaIntegration(metricsIngestionLambda), {
      apiKeyRequired: false, // For MVP, will add API keys later
    });

    // POST /v1/logs
    const logsResource = api.root.addResource('logs');
    logsResource.addMethod('POST', new apigateway.LambdaIntegration(logsIngestionLambda), {
      apiKeyRequired: false,
    });

    // GET /health (health check)
    const healthResource = api.root.addResource('health');
    healthResource.addMethod('GET', new apigateway.MockIntegration({
      integrationResponses: [{
        statusCode: '200',
        responseTemplates: {
          'application/json': '{"status": "healthy", "service": "cloudpulse-ingestion"}',
        },
      }],
      requestTemplates: {
        'application/json': '{"statusCode": 200}',
      },
    }), {
      methodResponses: [{
        statusCode: '200',
      }],
    });

    this.apiUrl = api.url;

    // ===== SQS Consumer Lambdas (Process messages async) =====

    // Metrics Processor (consumes from SQS, writes to Timestream)
    const metricsProcessorLambda = new lambda.Function(this, 'MetricsProcessorLambda', {
      functionName: 'cloudpulse-metrics-processor',
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('../services/processing/metrics-processor'),
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(300),
      environment: {
        TIMESTREAM_DATABASE: storageStack.timestreamDatabase.databaseName!,
        TIMESTREAM_TABLE: storageStack.metricsTable.tableName!,
      },
    });

    // Grant Timestream write
    metricsProcessorLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        'timestream:WriteRecords',
        'timestream:DescribeEndpoints',
      ],
      resources: [
        `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${storageStack.timestreamDatabase.databaseName}`,
        `arn:aws:timestream:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:database/${storageStack.timestreamDatabase.databaseName}/table/${storageStack.metricsTable.tableName}`,
      ],
    }));

    // SQS trigger
    metricsProcessorLambda.addEventSource(new cdk.aws_lambda_event_sources.SqsEventSource(this.metricsQueue, {
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(5),
    }));

    // ===== Stack Outputs =====

    new cdk.CfnOutput(this, 'IngestionAPIUrl', {
      value: this.apiUrl,
      description: 'CloudPulse Ingestion API URL',
      exportName: 'CloudPulse-IngestionAPIUrl',
    });

    new cdk.CfnOutput(this, 'MetricsEndpoint', {
      value: `${this.apiUrl}metrics`,
      description: 'Metrics Ingestion Endpoint',
    });

    new cdk.CfnOutput(this, 'LogsEndpoint', {
      value: `${this.apiUrl}logs`,
      description: 'Logs Ingestion Endpoint',
    });

    new cdk.CfnOutput(this, 'HealthEndpoint', {
      value: `${this.apiUrl}health`,
      description: 'Health Check Endpoint',
    });
  }
}
