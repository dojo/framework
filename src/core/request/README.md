## Features

This module allows the consumer to make HTTP requests using Node, XMLHttpRequest, or the Fetch API. The details of
these implementations are exposed through a common interface.

With this module you can,

* Easily make simple HTTP requests
* Convert response bodies to common formats like text, json, or html
* Access response headers of a request before the body is downloaded
* Monitor progress of a request
* Stream response data

## How do I use this package?

### Quick Start

To make simple GET requests, you must register your provider (node, or XHR) then make the request.  The overall
format of the API resembles the [Fetch Standard](https://fetch.spec.whatwg.org/).

```ts
import request from 'dojo-request';
import node from 'dojo-request/providers/node';

request.setDefaultProvider(node);

request.get('http://www.example.com').then(response => {
    return response.text();
}).then(html => {
    console.log(html);
});
```

Responses can be returned as an `ArrayBuffer`, `Blob`, XML document, JSON object, or text string.

You can also easily send request data,

```ts
request.post('http://www.example.com', {
    body: 'request data here'
}).then(response => {
    // ...
});
```

## Advanced Usage

### Reading Response Headers

This approach allows for processing of response headers _before_ the response body is available.

```ts
request.get('http://www.example.com').then(response => {
    const expectedSize = Number(response.headers.get('content-length') || 0);
});
```

### Response Events

`Response` objects also emit `start`, `end`, `progress`, and `data` events. You can use these events to monitor download progress
or stream a response directly to a file.

```ts
request.get('http://www.example.com').then(response => {
    response.on('progress', (event: ProgressEvent) => {
        console.log(`Total downloaded: ${event.totalBytesDownloaded}`);
    });

    return response.blob();
}).then(blob => {
    // do something with the data
});
```

Note that there are some caveats when using these events. XHR cannot stream data (a final `data` event is sent at the end however).
