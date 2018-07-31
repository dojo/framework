# request

This modules provides 4 methods (get, post, delete, and put) to simplify sending http requests. Each of these methods returns a promise that resolves with the response.

* request
  * get
  * post
  * delete
  * put

## Making Requests

Making requests is similar to using the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API).

A GET request,

```typescript
const json = await request('http://www.example.com').then(response => response.json());
```

A POST request,

```typescript
const response = await request.post('http://www.example.com', { body: JSON.stringify(myValues)}).then(response => response.json());
```

## Observables

Several observables are available to provide deeper insight into the state of a request.

### Monitoring Upload Progress

Upload progress can be monitored with the `upload` observable on the `Request` object. Since upload events automatically cause a preflight request, they can be disabled by setting `includeUploadProgress: false`.

```typescript
const req = request.post('http://www.example.com/', {
	body: someLargeString
});

req.upload.subscribe(uploadData => {
  const { loaded } = uploadData;
	// do something with uploaded bytes
});
```

Note that while the Node.js provider will emit a single upload event when it is done uploading, it cannot emit more granular upload events with `string` or `Buffer` body types. To receive more frequent upload events, you can use the `bodyStream` option to provide a `Readable` with the body content. Upload events will be emitted as the data is read from the stream.

```typescript
request.post('http://www.example.com/', {
	bodyStream: fs.createReadStream('some-large-file')
});
```

Progress events will always provide a `loaded` property that contains bytes uploaded, but the XMLHttpRequest provider will also emit data for `total` and `lengthComputable`:

```typescript
const xhr = xhr.post('http://www.example.com/', {
	body: someLargeString
});

xhr.upload.subscribe(uploadData => {
  const { loaded, total, lengthComputable } = uploadData;
	if (lengthComputable) {
    const percentComplete = loaded / total * 100;
  }
})
```

### Monitoring Download Progress

You can monitor download progress by subscribing to the `download` observable on the `Response` object.

```typescript
request("http://www.example/some-large-file").then(response => {
	response.download.subscribe(totalBytesDownloaded => {
		// do something with totalBytesDownloaded
	});
});
```

### Receiving Raw Data

You can receive the raw data from a response with the `data` observable. Depending on the provider, the value might be a `string`, or a `Buffer`.

```typescript
request("http://www.example/some-large-file").then(response => {
	response.data.subscribe(chunk => {
		// do something with chunk
	});
});
```
