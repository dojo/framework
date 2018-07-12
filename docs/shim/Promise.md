# Promise

An implementation of the [ES2015 Promise specification](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects).

Promises are used to reduce complications of asynchronous callbacks.

## Creating Promises

You can create a promise using the constructor:

```typescript
const p = new Promise((resolve, reject) => {
	// some long running task
	resolve();
});
```

or by using static convenience methods:

```typescript
const resolvePromise = Promise.resolve();
const rejectedPromise = Promise.reject();
```

Values can be wrapped in a resolved promise to facilitate simple caching:

```typescript
function loadData(): Promise<Data> {
	if (cached) {
		return Promise.resolve(cachedData);
	} else {
		return loadData().then((data) => {
			cachedData = data;
			return data;
		});
	}
}

loadData().then((data) => {
	// use loaded data
});
```

Two special Promise helpers can create a single Promise from a list of Promises.

```typescript
// Promise.all
const task1 = startLongRunningTask();
const task2 = startLongRunningTask();

Promise.all([task1, task2]).then(() => {
	// all tasks are completed
});

// Promise.race
const task1 = startLongRunningTask();
const task2 = startLongRunningTask();

Promise.race([task1, task2]).then(() => {
	// either task1 or task2 has completed
});
```

## Using Promises

Use the `then` and `catch` methods to interact with Promises.

### Then

`.then(successHandler, errorHandler)` is used to handle the resolution (or failure) of a promise. `errorHandler` is optional. The resolve, or rejected, value is passed to the handler.

```typescript
const resolvePromise = Promise.resolve(true);
const rejectedPromise = Promise.reject(new Error('some error'));

resolvedPromise.then((value) => {
	// value is true
});

rejectedPromise.then((value) => {
	// code is not reached as it is handled by the error handler
}, (error) => {
	// error is 'some error'
});
```

### Catch

The `.catch(errorHandler)` method is a convenience method to just add an error handler.

```typescript
rejectedPromise.catch((error) => {
	// error is 'some error'
});
```

