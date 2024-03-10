import { SQS } from '@aws-sdk/client-sqs';

// eslint-disable-next-line no-unused-vars
export const handler = async (event, context) => {
  const sqsConfig = {
    endpoint: 'http://localstack:4576',
    region: 'us-east-1',
    credentials: {
      accessKeyId: 'root',
      secretAccessKey: 'root',
    },
  };
  const sqs = new SQS(sqsConfig);
  const params = {
    MessageBody: 'test',
    QueueUrl: 'http://localstack:4576/queue/test-sqs',
  };
  const sent = await sqs.sendMessage(params);
  return sent;
};
