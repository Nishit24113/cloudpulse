"""
CloudPulse Metrics Ingestion API
Receives metrics from any application and sends to SQS for processing
"""
import json
import os
import time
import boto3
from typing import Dict, List, Any

# Initialize AWS clients
sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')

METRICS_QUEUE_URL = os.environ['METRICS_QUEUE_URL']
METRICS_TABLE = os.environ['METRICS_TABLE']
metrics_table = dynamodb.Table(METRICS_TABLE)


def lambda_handler(event, context):
    """
    Lambda handler for metrics ingestion
    Accepts POST requests with metrics in JSON format
    """
    print(f"📊 Metrics Ingestion Request: {event}")

    try:
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        # Extract metrics array
        metrics = body.get('metrics', [])

        if not metrics:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'No metrics provided',
                    'message': 'Request must include "metrics" array'
                })
            }

        # Validate and enrich metrics
        enriched_metrics = []
        current_time = int(time.time() * 1000)  # milliseconds

        for metric in metrics:
            # Validate required fields
            if 'metric' not in metric or 'value' not in metric:
                continue

            enriched = {
                'metric': metric['metric'],
                'value': float(metric['value']),
                'timestamp': metric.get('timestamp', current_time),
                'app_id': metric.get('app_id', 'unknown'),
                'org_id': metric.get('org_id', 'default'),
                'tags': metric.get('tags', {}),
            }
            enriched_metrics.append(enriched)

        if not enriched_metrics:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                'body': json.dumps({
                    'error': 'No valid metrics',
                    'message': 'All metrics must have "metric" and "value" fields'
                })
            }

        # Send to SQS for async processing
        sqs_response = sqs.send_message(
            QueueUrl=METRICS_QUEUE_URL,
            MessageBody=json.dumps({'metrics': enriched_metrics}),
            MessageAttributes={
                'source': {'StringValue': 'metrics-ingestion', 'DataType': 'String'},
                'count': {'StringValue': str(len(enriched_metrics)), 'DataType': 'Number'},
            }
        )

        print(f"✅ Sent {len(enriched_metrics)} metrics to SQS: {sqs_response['MessageId']}")

        # For demo/testing: Also write directly to DynamoDB (bypass queue)
        # In production, only queue would be used
        try:
            write_to_dynamodb(enriched_metrics)
        except Exception as e:
            print(f"⚠️  DynamoDB direct write failed (non-critical): {e}")

        return {
            'statusCode': 202,  # Accepted
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'status': 'accepted',
                'message': f'Received {len(enriched_metrics)} metrics',
                'count': len(enriched_metrics),
                'message_id': sqs_response['MessageId']
            })
        }

    except json.JSONDecodeError as e:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Invalid JSON',
                'message': str(e)
            })
        }

    except Exception as e:
        print(f"❌ Error processing metrics: {e}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }


def write_to_dynamodb(metrics: List[Dict[str, Any]]):
    """
    Write metrics directly to DynamoDB
    (For demo purposes - production would use SQS consumer)
    """
    if not metrics:
        return

    # Write in batches (DynamoDB limit: 25 items per batch)
    batch_size = 25
    for i in range(0, len(metrics), batch_size):
        batch = metrics[i:i + batch_size]
        try:
            with metrics_table.batch_writer() as writer:
                for metric in batch:
                    # TTL: 90 days from now
                    ttl = int(time.time()) + (90 * 24 * 60 * 60)

                    item = {
                        'metric_app': f"{metric['metric']}#{metric['app_id']}",
                        'timestamp': metric['timestamp'],
                        'metric_name': metric['metric'],
                        'app_id': metric['app_id'],
                        'org_id': metric['org_id'],
                        'value': metric['value'],
                        'tags': json.dumps(metric.get('tags', {})),
                        'ttl': ttl
                    }
                    writer.put_item(Item=item)

            print(f"✅ Wrote {len(batch)} records to DynamoDB")
        except Exception as e:
            print(f"❌ DynamoDB batch write failed: {e}")
            raise


# For local testing
if __name__ == '__main__':
    # Test event
    test_event = {
        'body': json.dumps({
            'metrics': [
                {
                    'metric': 'api.response_time',
                    'value': 125.5,
                    'app_id': 'demo-app',
                    'tags': {'endpoint': '/users', 'method': 'GET'}
                },
                {
                    'metric': 'api.requests',
                    'value': 1,
                    'app_id': 'demo-app',
                    'tags': {'endpoint': '/users', 'method': 'GET', 'status': '200'}
                }
            ]
        })
    }

    # Mock environment
    os.environ.setdefault('METRICS_QUEUE_URL', 'mock-queue-url')
    os.environ.setdefault('METRICS_TABLE', 'cloudpulse-metrics')

    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
