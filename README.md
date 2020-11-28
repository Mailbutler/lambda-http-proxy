# Lamda HTTP Proxy

> Simple wrapper function to easily send HTTP requests via a Lambda proxy function

[![NPM Version][npm-image]][npm-url]
[![Downloads Stats][npm-downloads]][npm-url]

If you run into the problem of not being able to perform HTTP requests to external resources from a resource **within a VPC**, e.g. a Lambda function, then performing the HTTP request through a simple Lambda HTTP proxy function could be a solution.

This module provides a simple abstraction to send HTTP requests through a separate AWS Lambda proxy function. The provided interface uses Axios request/response object structures to simplify replacement of existing Axios calls.

## Installation

```sh
npm install lambda-http-proxy --save
```

## AWS Requirements

### Lambda Proxy Function

To perform HTTP requests from within a VPC without paying for more networking resources, such as Elastic IPs and NAT Gateways, you first need to create a separate Lambda function that acts as a HTTP proxy for your requests.

The Lambda proxy function simply performs the actual request via Axios (with the given configuration parameter) and returns the response object back to the caller of the Lambda proxy function:

```js
const axios = require('axios');

exports.handler = function (event, context) {
  axios(event).then((response) => context.succeed(response));
};
```

### VPC Endpoint

To allow calling the new Lambda proxy function from within the VPC, you need to add a VPC Endpoint for Lambda, according to this document:
https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-endpoints.html

## Usage example

After having prepared your AWS environment, you can now import the module into your project, e.g. a Lambda function and send external HTTP requests via the Lambda proxy function:

```js
import { lambdaProxyRequest } from '@mailbutler/lambda-http-proxy';

const requestConfig = {
  // name of the Lambda HTTP proxy function (see above)
  lambdaFunctionName: 'lambda-http-proxy',

  // axios request configuration
  url: 'https://jsonplaceholder.typicode.com/todos',
  method: 'get',
};

const httpResponse = await lambdaProxyRequest(requestConfig);
```

## Release History

- 1.0
  - Initial version

## Contributing

1. Fork it (<https://github.com/mailbutler/lambda-http-proxy/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

<!-- Markdown link & img dfn's -->

[npm-image]: https://img.shields.io/npm/v/@mailbutler/lambda-http-proxy.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@mailbutler/lambda-http-proxy
[npm-downloads]: https://img.shields.io/npm/dm/@mailbutler/lambda-http-proxy.svg?style=flat-square
