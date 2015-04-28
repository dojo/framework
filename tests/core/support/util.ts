export function isEventuallyRejected(promise: Promise<any>): Promise<any> {
	return promise.then<any>(function () {
		console.log(arguments);
		throw new Error('unexpected code path');
	}, function () {
		return true; // expect rejection
	});
}

export function throwImmediatly() {
	throw new Error('unexpected code path');
}
