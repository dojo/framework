import { Thenable } from 'dojo-shim/interfaces';
export { Thenable } from 'dojo-shim/interfaces';

export function isEventuallyRejected<T>(promise: Thenable<T>): Thenable<boolean> {
	return promise.then<any>(function () {
		throw new Error('unexpected code path');
	}, function () {
		return true; // expect rejection
	});
}

export function throwImmediatly() {
	throw new Error('unexpected code path');
}
