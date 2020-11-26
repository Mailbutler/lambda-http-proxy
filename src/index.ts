import * as AWS from 'aws-sdk';

type HTTPVerb = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'purge' | 'link' | 'unlink' | 'options';
export type Method = HTTPVerb | `${Uppercase<HTTPVerb>}`;

export type ResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';

// load AWS parameters
AWS.config.region = process.env.AWS_REGION || 'eu-central-1';

var lambda = new AWS.Lambda();

export interface LambdaHTTPRequest {
  lambdaFunctionName?: string;

  // HTTP request configuration
  url?: string;
  method?: Method;
  headers?: any;
  params?: any;
  data?: any;
  timeout?: number;
  responseType?: ResponseType;
}

export interface LambdaHTTPResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: LambdaHTTPRequest;
}

export async function lambdaProxyRequest(requestConfig: LambdaHTTPRequest): Promise<LambdaHTTPResponse> {
  const lambdaFunctionName = requestConfig.lambdaFunctionName || process.env.LAMBDA_FUNCTION_NAME;
  if (!lambdaFunctionName) {
    throw new Error('No Lambda function name specified!');
  }

  const lambdaParams = {
    FunctionName: lambdaFunctionName,
    InvocationType: 'RequestResponse',
    LogType: process.env.LAMBDA_LOG_TYPE || 'Tail',
    Payload: JSON.stringify(requestConfig),
  };

  return new Promise<LambdaHTTPResponse>((resolve, reject) => {
    lambda.invoke(lambdaParams, (error, lambdaResponse) => {
      if (error) {
        reject(error);
      } else {
        try {
          if (!lambdaResponse.Payload) {
            throw new Error('Lambda response payload is empty!');
          }

          resolve(JSON.parse(lambdaResponse.Payload.toString()));
        } catch (error) {
          reject(new Error(`Failed to parse response '${lambdaResponse.Payload}' from Lambda: ${error.message}`));
        }
      }
    });
  });
}
