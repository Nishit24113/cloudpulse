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
timestream_write = boto3.client('timestream-write')

METRICS_QUEUE_URL = os.environ['METRICS_QUEUE_URL']
TIMESTREAM_DATABASE = os.environ['TIMESTREAM_DATABASE']
TIMESTREAM_TABLE = os.environ['TIMESTREAM_TABLE']


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

        # For demo/testing: Also write directly to Timestream (bypass queue)
        # In production, only queue would be used
        try:
            write_to_timestream(enriched_metrics)
        except Exception as e:
            print(f"⚠️  Timestream direct write failed (non-critical): {e}")

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


def write_to_timestream(metrics: List[Dict[str, Any]]):
    """
    Write metrics directly to Timestream
    (For demo purposes - production would use SQS consumer)
    """
    if not metrics:
        return

    records = []

    for metric in metrics:
        # Build dimensions from tags
        dimensions = [
            {'Name': 'app_id', 'Value': metric['app_id']},
            {'Name': 'org_id', 'Value': metric['org_id']},
            {'Name': 'metric_name', 'Value': metric['metric']},
        ]

        # Add custom tags as dimensions
        for key, value in metric.get('tags', {}).items():
            dimensions.append({'Name': key, 'Value': str(value)})

        # Timestream record
        record = {
            'Dimensions': dimensions,
            'MeasureName': 'value',
            'MeasureValue': str(metric['value']),
            'MeasureValueType': 'DOUBLE',
            'Time': str(metric['timestamp']),
            'TimeUnit': 'MILLISECONDS'
        }
        records.append(record)

    # Write in batches (Timestream limit: 100 records per write)
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            response = timestream_write.write_records(
                DatabaseName=TIMESTREAM_DATABASE,
                TableName=TIMESTREAM_TABLE,
                Records=batch
            )
            print(f"✅ Wrote {len(batch)} records to Timestream")
        except Exception as e:
            print(f"❌ Timestream batch write failed: {e}")
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
    os.environ.setdefault('TIMESTREAM_DATABASE', 'cloudpulse_metrics')
    os.environ.setdefault('TIMESTREAM_TABLE', 'metrics')

    result = lambda_handler(test_event, None)
    print(json.dumps(result, indent=2))
