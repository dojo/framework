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

let _hasClassName: boolean;

/**
 * Detects if the runtime environment supports a class name
 */
export function hasClassName(): boolean {
	if (_hasClassName !== undefined) {
		return _hasClassName;
	}
	class Foo {}
	return _hasClassName = Boolean((<any> Foo.constructor).name);
}
