"""
CloudPulse Logs Ingestion API
Receives structured logs from any application
"""
import json
import os
import time
import boto3
from typing import Dict, List

sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

LOGS_QUEUE_URL = os.environ['LOGS_QUEUE_URL']
LOGS_INDEX_TABLE = os.environ['LOGS_INDEX_TABLE']
LOGS_BUCKET = os.environ['LOGS_BUCKET']

logs_table = dynamodb.Table(LOGS_INDEX_TABLE)


def lambda_handler(event, context):
    """
    Lambda handler for logs ingestion
    Accepts POST requests with logs in JSON format
    """
    print(f"📝 Logs Ingestion Request")

    try:
        # Parse request body
        if 'body' in event:
            body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            body = event

        logs = body.get('logs', [])

        if not logs:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No logs provided'})
            }

        # Enrich logs
        enriched_logs = []
        current_time = int(time.time() * 1000)

        for log in logs:
            enriched = {
                'timestamp': log.get('timestamp', current_time),
                'level': log.get('level', 'INFO').upper(),
                'message': log.get('message', ''),
                'app_id': log.get('app_id', 'unknown'),
                'org_id': log.get('org_id', 'default'),
                'tags': log.get('tags', {}),
                'attributes': log.get('attributes', {}),
            }
            enriched_logs.append(enriched)

        # Send to SQS
        sqs_response = sqs.send_message(
            QueueUrl=LOGS_QUEUE_URL,
            MessageBody=json.dumps({'logs': enriched_logs})
        )

        # Quick write to DynamoDB for immediate queries
        for log in enriched_logs[:10]:  # Limit to 10 for quick response
            try:
                # Set TTL for auto-deletion after 30 days
                ttl = int(time.time()) + (30 * 24 * 60 * 60)

                logs_table.put_item(Item={
                    'app_id': log['app_id'],
                    'timestamp': log['timestamp'],
                    'level': log['level'],
                    'level_timestamp': f"{log['level']}#{log['timestamp']}",
                    'message': log['message'],
                    'tags': json.dumps(log['tags']),
                    'attributes': json.dumps(log['attributes']),
                    'ttl': ttl
                })
            except Exception as e:
                print(f"⚠️  DynamoDB write failed: {e}")

        print(f"✅ Received {len(enriched_logs)} logs")

        return {
            'statusCode': 202,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'status': 'accepted',
                'count': len(enriched_logs),
                'message_id': sqs_response['MessageId']
            })
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
