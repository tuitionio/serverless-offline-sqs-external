"use strict";

var _clientLambda = require("@aws-sdk/client-lambda");
var _clientSqs = require("@aws-sdk/client-sqs");
var _url = require("url");
var _helpers = require("./helpers");
class ServerlessOfflineSQSExternal {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.service = serverless.service;
    this.options = options;
    this.commands = {};
    this.hooks = {
      'before:offline:start': this.offlineStartInit.bind(this),
      'before:offline:start:init': this.offlineStartInit.bind(this),
      'before:offline:start:end': this.offlineStartEnd.bind(this)
    };
    this.streams = [];
  }
  getOfflineConfig() {
    var _this$service$custom;
    const config = ((_this$service$custom = this.service.custom) === null || _this$service$custom === void 0 ? void 0 : _this$service$custom['serverless-offline']) || {};
    return {
      ...config,
      endpoint: config.endpoint || 'http://localhost:3002'
    };
  }
  getSqsConfig() {
    var _this$service$custom2;
    const config = ((_this$service$custom2 = this.service.custom) === null || _this$service$custom2 === void 0 ? void 0 : _this$service$custom2['serverless-offline-sqs-external']) || {};
    let {
      endpoint,
      host = 'localhost',
      port = 4576,
      https = false
    } = config;
    if (!endpoint) {
      endpoint = `${https ? 'https://' : 'http://'}${host}:${port}`;
    } else {
      const url = new _url.URL(endpoint);
      host = url.hostname;
      port = url.port;
      https = url.protocol;
    }
    return {
      ...config,
      host,
      port,
      endpoint
    };
  }
  getConfig() {
    return {
      ...this.options,
      ...this.service,
      ...this.service.provider
    };
  }
  getClient() {
    const config = this.getSqsConfig();
    const sqsConfig = {
      endpoint: config.endpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    };
    return new _clientSqs.SQS(sqsConfig);
  }
  getProperties(queueEvent) {
    var _queueEvent$arn;
    const getAtt = queueEvent === null || queueEvent === void 0 ? void 0 : (_queueEvent$arn = queueEvent.arn) === null || _queueEvent$arn === void 0 ? void 0 : _queueEvent$arn['Fn::GetAtt'];
    if (getAtt) {
      var _this$service, _this$service$resourc, _this$service$resourc2, _this$service$resourc3;
      const [resourceName] = getAtt;
      const properties = (_this$service = this.service) === null || _this$service === void 0 ? void 0 : (_this$service$resourc = _this$service.resources) === null || _this$service$resourc === void 0 ? void 0 : (_this$service$resourc2 = _this$service$resourc.Resources) === null || _this$service$resourc2 === void 0 ? void 0 : (_this$service$resourc3 = _this$service$resourc2[resourceName]) === null || _this$service$resourc3 === void 0 ? void 0 : _this$service$resourc3.Properties;
      if (!properties) throw new Error(`No resource defined with name ${resourceName}`);
      return Object.entries(properties).map(([key, value]) => {
        if (!(0, _helpers.isPlainObject)(value)) return [key, value.toString()];
        if (Object.keys(value).some(k => k === 'Ref' || k.startsWith('Fn::')) || Object.values(value).some(_helpers.isPlainObject)) {
          return this.serverless.cli.log(`WARN ignore property '${key}' in config as it is some cloudformation reference: ${JSON.stringify(value)}`);
        }
        return [key, JSON.stringify(value)];
      }).filter(val => !(0, _helpers.isFalsey)(val)).reduce((obj, [key, value]) => ({
        ...obj,
        [key]: value
      }), {});
    }
    return null;
  }
  getProperty(queueEvent, propertyName) {
    const properties = this.getProperties(queueEvent);
    return (properties === null || properties === void 0 ? void 0 : properties[propertyName]) || null;
  }
  getQueueName(queueEvent) {
    if (typeof queueEvent === 'string') return (0, _helpers.extractQueueNameFromARN)(queueEvent);
    if (typeof queueEvent.arn === 'string') return (0, _helpers.extractQueueNameFromARN)(queueEvent.arn);
    if (typeof queueEvent.queueName === 'string') return queueEvent.queueName;
    const queueName = this.getProperty(queueEvent, 'QueueName');
    if (!queueName) {
      throw new Error('QueueName not found. See https://github.com/CoorpAcademy/serverless-plugins/tree/master/packages/serverless-offline-sqs#functions');
    }
    return queueName;
  }
  async eventHandler(queueEvent, functionName, messages) {
    var _this$service2, _this$service2$provid;
    if (!messages) return Promise.resolve();
    const streamName = this.getQueueName(queueEvent);
    this.serverless.cli.log(`${streamName} (λ: ${functionName})`);
    const config = this.getConfig();
    const awsRegion = config.region || 'us-east-1';
    const awsAccountId = config.accountId || '000000000000';
    const eventSourceARN = typeof queueEvent.arn === 'string' ? queueEvent.arn : `arn:aws:sqs:${awsRegion}:${awsAccountId}:${streamName}`;
    const func = this.service.getFunction(functionName);
    const {
      env
    } = process;
    const functionEnv = {
      ...{
        AWS_REGION: awsRegion
      },
      ...(env || {}),
      ...((this === null || this === void 0 ? void 0 : (_this$service2 = this.service) === null || _this$service2 === void 0 ? void 0 : (_this$service2$provid = _this$service2.provider) === null || _this$service2$provid === void 0 ? void 0 : _this$service2$provid.environment) || {}),
      ...((func === null || func === void 0 ? void 0 : func.environment) || {})
    };
    process.env = functionEnv;
    const event = {
      Records: messages.map(({
        MessageId: messageId,
        ReceiptHandle: receiptHandle,
        Body: body,
        Attributes: attributes,
        MessageAttributes: messageAttributes,
        MD5OfBody: md5OfBody
      }) => ({
        messageId,
        receiptHandle,
        body,
        attributes,
        messageAttributes,
        md5OfBody,
        eventSource: 'aws:sqs',
        eventSourceARN,
        awsRegion
      }))
    };
    const offlineConfg = this.getOfflineConfig();
    const lambdaConfig = {
      apiVersion: '2015-03-31',
      endpoint: offlineConfg.endpoint,
      region: awsRegion,
      credentials: {
        accessKeyId: 'foo',
        secretAccessKey: 'bar'
      }
    };
    const lambda = new _clientLambda.Lambda(lambdaConfig);
    const params = {
      FunctionName: func.name,
      InvocationType: 'Event',
      Payload: JSON.stringify(event)
    };
    await lambda.invoke(params);
    process.env = env;
    return null;
  }
  async createQueueReadable(functionName, queueEvent) {
    const client = this.getClient();
    const QueueName = this.getQueueName(queueEvent);
    this.serverless.cli.log(`Queue Name: ${QueueName}`);
    const sqsConfig = this.getSqsConfig();
    if (sqsConfig.autoCreate) {
      const properties = this.getProperties(queueEvent);
      const params = {
        QueueName,
        Attributes: (0, _helpers.omit)(['QueueName'], properties)
      };
      await client.createQueue(params);
    }
    let {
      QueueUrl
    } = await client.getQueueUrl({
      QueueName
    });
    QueueUrl = QueueUrl.replace('localhost', sqsConfig.host);
    const next = async () => {
      var _receiveMessageOutput;
      const receiveMessageOutput = await client.receiveMessage({
        QueueUrl,
        MaxNumberOfMessages: queueEvent.batchSize,
        AttributeNames: ['All'],
        MessageAttributeNames: ['All'],
        WaitTimeSeconds: 20
      });
      if (receiveMessageOutput !== null && receiveMessageOutput !== void 0 && (_receiveMessageOutput = receiveMessageOutput.Messages) !== null && _receiveMessageOutput !== void 0 && _receiveMessageOutput.length) {
        try {
          await this.eventHandler(queueEvent, functionName, receiveMessageOutput.Messages);
          const command = new _clientSqs.DeleteMessageBatchCommand({
            Entries: receiveMessageOutput.Messages.map(({
              MessageId: Id,
              ReceiptHandle
            }) => ({
              Id,
              ReceiptHandle
            })),
            QueueUrl
          });
          await client.send(command);
        } catch (err) {
          this.serverless.cli.log(err.stack);
        }
      }
      next();
    };
    next();
  }
  offlineStartInit() {
    this.serverless.cli.log('Starting Offline SQS.');
    Object.entries(this.service.functions).map(([functionName, _function]) => {
      const queues = ((_function === null || _function === void 0 ? void 0 : _function.events) || []).filter(event => event === null || event === void 0 ? void 0 : event.sqs).map(event => event.sqs);
      if (!(0, _helpers.isEmpty)(queues)) {
        (0, _helpers.printBlankLine)();
        this.serverless.cli.log(`SQS for ${functionName} (exposed as ${_function.name}):`);
      }
      queues.forEach(queueEvent => {
        this.createQueueReadable(functionName, queueEvent);
      });
      if (!(0, _helpers.isEmpty)(queues)) {
        (0, _helpers.printBlankLine)();
      }
      return null;
    });
  }
  offlineStartEnd() {
    this.serverless.cli.log('offline-start-end');
  }
}
module.exports = ServerlessOfflineSQSExternal;
//# sourceMappingURL=index.js.map