import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { gunzipSync, gzipSync } from 'zlib';
import { lambdaProxyRequest } from '../';

const send = jest.spyOn(LambdaClient.prototype, 'send') as unknown as jest.Mock;

function invocationPayload(): any {
  const command = send.mock.calls[0][0] as InvokeCommand;
  return JSON.parse(command.input.Payload as string);
}

beforeEach(() => {
  send.mockReset();
  send.mockResolvedValue({
    Payload: new TextEncoder().encode(JSON.stringify({ status: 200, data: { ok: true }, headers: {} })),
  });
});

const envelope = '{"event_id":"abc"}\n{"type":"event"}\n' + JSON.stringify({ message: 'x'.repeat(40000) + 'äöü €' });

test('invokes the function and returns the parsed response', async () => {
  const response = await lambdaProxyRequest({ lambdaFunctionName: 'proxy', url: 'https://example.com', method: 'get' });

  expect((send.mock.calls[0][0] as InvokeCommand).input.FunctionName).toBe('proxy');
  expect(invocationPayload()).toEqual({ lambdaFunctionName: 'proxy', url: 'https://example.com', method: 'get' });
  expect(response).toEqual({ status: 200, data: { ok: true }, headers: {} });
});

test('string data is sent unchanged without dataEncoding', async () => {
  await lambdaProxyRequest({ lambdaFunctionName: 'proxy', method: 'POST', data: envelope });

  const payload = invocationPayload();
  expect(payload.data).toBe(envelope);
  expect(payload.dataEncoding).toBeUndefined();
});

test.each([
  ['Buffer', (b: Buffer) => b],
  ['Uint8Array', (b: Buffer) => new Uint8Array(b)],
  ['ArrayBuffer', (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)],
])('binary data (%s) is sent base64 encoded with dataEncoding', async (_name, convert) => {
  const gzipped = gzipSync(envelope);

  await lambdaProxyRequest({
    lambdaFunctionName: 'proxy',
    method: 'POST',
    headers: { 'content-encoding': 'gzip' },
    data: convert(gzipped),
  });

  const payload = invocationPayload();
  expect(payload.dataEncoding).toBe('base64');
  expect(payload.headers).toEqual({ 'content-encoding': 'gzip' });
  const bytes = Buffer.from(payload.data, 'base64');
  expect(bytes.equals(gzipped)).toBe(true);
  expect(gunzipSync(bytes).toString('utf8')).toBe(envelope);
});

test('does not modify the caller config', async () => {
  const config = { lambdaFunctionName: 'proxy', data: Buffer.from('abc') };
  await lambdaProxyRequest(config);

  expect(Buffer.isBuffer(config.data)).toBe(true);
  expect(config).not.toHaveProperty('dataEncoding');
});
