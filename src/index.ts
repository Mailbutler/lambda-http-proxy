import { InvocationType, InvokeCommand, LambdaClient, LogType } from "@aws-sdk/client-lambda";

type HTTPVerb = 'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'purge' | 'link' | 'unlink' | 'options';
export type Method = HTTPVerb | `${Uppercase<HTTPVerb>}`;

export type ResponseType = 'arraybuffer' | 'blob' | 'document' | 'json' | 'text' | 'stream';

// a client can be shared by different commands.
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION || 'eu-central-1' });

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

  const command = new InvokeCommand({
    FunctionName: lambdaFunctionName,
    InvocationType: InvocationType.RequestResponse,
    Payload: JSON.stringify(requestConfig),
    LogType: process.env.LAMBDA_LOG_TYPE || LogType.Tail,
  });
  const lambdaResponse = await lambdaClient.send(command)
  if (!lambdaResponse.Payload) {
    throw new Error('Lambda response payload is empty!');
  }

  return JSON.parse(lambdaResponse.Payload.toString())
}
