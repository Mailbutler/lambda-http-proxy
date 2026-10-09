import { InvocationType, InvokeCommand, LambdaClient, LogType } from '@aws-sdk/client-lambda';

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
  /**
   * Request body. Binary data (Buffer, Uint8Array, ArrayBuffer) is sent base64 encoded with
   * `dataEncoding: 'base64'` and forwarded as the original bytes by the proxy function.
   */
  data?: any;
  /** Set automatically for binary `data`; requires lambda-http-proxy-function with SEC-223. */
  dataEncoding?: 'base64';
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
    Payload: serializeRequest(requestConfig),
    LogType: (process.env.LAMBDA_LOG_TYPE as LogType) || LogType.Tail,
  });
  const lambdaResponse = await lambdaClient.send(command);
  if (!lambdaResponse.Payload) {
    throw new Error('Lambda response payload is empty!');
  }

  const jsonResponseString = new TextDecoder().decode(lambdaResponse.Payload);
  return JSON.parse(jsonResponseString);
}

/**
 * Serializes the request config as invocation payload (JSON). Binary data would not survive
 * JSON (Buffer -> {type, data}, Uint8Array -> object), so it is base64 encoded and flagged.
 */
export function serializeRequest(requestConfig: LambdaHTTPRequest): string {
  const { data } = requestConfig;
  if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
    const bytes =
      data instanceof ArrayBuffer ? Buffer.from(data) : Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    return JSON.stringify({ ...requestConfig, data: bytes.toString('base64'), dataEncoding: 'base64' });
  }
  return JSON.stringify(requestConfig);
}
