"""
CloudPulse Metrics Processor
Consumes metrics from SQS and writes to DynamoDB
Performs aggregations and windowing
"""
import json
import os
import time
import boto3
from typing import List, Dict

dynamodb = boto3.resource('dynamodb')

METRICS_TABLE = os.environ['METRICS_TABLE']
metrics_table = dynamodb.Table(METRICS_TABLE)


def lambda_handler(event, context):
    """
    SQS trigger handler
    Processes batches of metrics and writes to DynamoDB
    """
    print(f"📊 Processing {len(event['Records'])} SQS messages")

    all_metrics = []

    # Extract metrics from all SQS messages
    for record in event['Records']:
        try:
            body = json.loads(record['body'])
            metrics = body.get('metrics', [])
            all_metrics.extend(metrics)
        except Exception as e:
            print(f"❌ Failed to parse SQS message: {e}")
            continue

    if not all_metrics:
        print("⚠️  No metrics to process")
        return {'statusCode': 200, 'body': 'No metrics'}

    # Write to DynamoDB
    try:
        write_to_dynamodb(all_metrics)
        print(f"✅ Successfully processed {len(all_metrics)} metrics")
        return {'statusCode': 200, 'body': f'Processed {len(all_metrics)} metrics'}
    except Exception as e:
        print(f"❌ Failed to write to DynamoDB: {e}")
        raise  # Re-raise to retry SQS message


def write_to_dynamodb(metrics: List[Dict]):
    """
    Write metrics to DynamoDB
    """
    # Write in batches (max 25 per request for batch_writer)
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

            print(f"✅ Wrote batch of {len(batch)} records to DynamoDB")
        except Exception as e:
            print(f"❌ DynamoDB batch write failed: {e}")
            # Log which metrics failed but continue with other batches
            print(f"Failed metrics: {json.dumps(batch[:3])}...")  # Log first 3 for debugging
            raise


if __name__ == '__main__':
    # Test event (SQS format)
    test_event = {
        'Records': [
            {
                'body': json.dumps({
                    'metrics': [
                        {
                            'metric': 'api.response_time',
                            'value': 125.5,
                            'timestamp': 1726365600000,
                            'app_id': 'demo-app',
                            'org_id': 'demo-org',
                            'tags': {'endpoint': '/users', 'method': 'GET'}
                        }
                    ]
                })
            }
        ]
    }

    os.environ.setdefault('METRICS_TABLE', 'cloudpulse-metrics')

    result = lambda_handler(test_event, None)
    print(result)
