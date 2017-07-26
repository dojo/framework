export function isEventuallyRejected<T>(promise: PromiseLike<T>): PromiseLike<boolean> {
	return promise.then(function () {
		throw new Error('unexpected code path');
	}, function () {
		return true; // expect rejection
	});
}

export function throwImmediatly() {
	throw new Error('unexpected code path');
}
