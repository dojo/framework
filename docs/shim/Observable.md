# Observable

The `@dojo/shim/Observable` class is an implementation of the proposed [Observable specification](https://tc39.github.io/proposal-observable/).

An `Observable` is used to simplify push-based data sources like events, timed events, or sockets.

Here we create an Observable that publishes an event every 1 second:

```typescript
const timedObservable = new Observable(observer => {
	let handle = null;
  
	function timer() {
		observer.next();
		handle = setTimeout(timer, 1000);
	}
  
	handle = setTimeout(timer, 1000);
  
	return () => {
        clearTimeout(handle);
	};
});

let seconds = 0;
const subscription = timedObservable.subscribe(() => {
	// 1 second has elapsed
	seconds++;
  
	if (seconds >= 5) {
		subscription.unsubscribe();
	}
});
```

Here we are creating an Observable that publishes an event every second. Note that one timer is started _per subscriber_, and if there are no subscribers, no timers are scheduled.

## Creation

Observables can be created with their constructor:

```typescript
new Observable((observer: SubscriptionObserver) => {
	observer.next(1);
	observer.next(2);  
	observer.next(3);
	observer.complete();
});
```

Observables can also be created with the `of` and `from` static methods.

When creating an observable with a constructor, you receive a single argument, the `SubscriptionObserver`. Interactions between the Observable and the subscriber are handled through this object.

The `SubscriptionObserver` can publish values, errors, or signal completion of the Observable.

```typescript
// publish two values, then signal completion
new Observable(observer => {
	observer.next(1);
	observer.next(2);
	observer.complete();
});

// publish a value, then error
new Observable(observer => {
	observer.next(1);
	observer.error(new Error('some error'));
});
```

### `of`

`Observable.of` is used to create an Observable from a series of parameters. The observable will return each parameter in order.

```typescript
// Observable.of
const obs = Observable.of(1, 2, 3);
obs.subscribe(value => {
	console.log(value);
});

// Outputs:
// 1
// 2
// 3
```

### `from`

`Observable.from` is used to create an Observable from a list of values, either an array, an `Iterable` object, or another Observable. The subscribers will be called once for every value in the wrapped object.

```typescript
// Observable.from
const obs = Observable.from(someIterator);
obs.subscribe(value => {
	// handle iterator value
});
```

## Subscriptions

When the `subscribe` method is called on an Observable, a `Subscription` is created. This `Subscription` can be used to check if the subscription is still active, or to unsubscribe from the Observable.

```typescript
const subscription = someObservable.subscribe(someSubscriber);

// ...

if (subscription.closed) {
	// handle a closed subscription
} else {
	// unsubscribe from the subscription
	subscription.unsubscribe();
}
```

Once you are unsubscribed, you will no longer received published values.

The `subscribe` method takes either a list of function handlers or an `Observer` which contains the handlers.

```typescript
// note that the error handler and completion handler are optional
someObservable.subscribe((value) => {
	// next
}, (error) => {
	// error handler
}, (value) => {
	// completion handler
});

// note that every field is optional
someObservable.subscribe({
	completion(value) {
		// completion handler
	},

	error(error) {
		// error handler
	},

	next(value) {
		// next
	},

	start(observer) {
		// called when the subscription starts, before any events are emitted
	}
});
```
