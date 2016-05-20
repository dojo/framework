export interface CancelableEvent<T extends string, U> {
	/**
	 * The type of the event
	 * TODO: Mark as readonly in TS2
	 */
	type: T;

	/**
	 * The target for the event
	 * TODO: Mark as readonly in TS2
	 */
	target: U;

	/**
	 * Can the event be canceled?
	 * TODO: Mark as readonly in TS2
	 */
	cancelable: boolean;

	/**
	 * Was the event canceled?
	 * TODO: Mark as readonly in TS2
	 */
	defaultPrevented: boolean;

	/**
	 * Cancel the event
	 * TODO: Mark as readonly in TS2
	 */
	preventDefault(): void;
}

/**
 * A simple factory that creates an event object which can be cancelled
 * @param options The options for the event
 */
function createCancelableEvent<T extends string, U>(options: { type: T, target: U }): CancelableEvent<T, U> {
	const { type, target } = options;
	const event: CancelableEvent<T, U> = Object.defineProperties({}, {
		type: { value: type, enumerable: true },
		target: { value: target, enumerable: true },
		cancelable: { value: true, enumerable: true },
		defaultPrevented: { value: false, enumerable: true, configurable: true },
		preventDefault: { value() {
			Object.defineProperty(event, 'defaultPrevented', { value: true, enumerable: true });
		}, enumerable: true }
	});

	return event;
}

export default createCancelableEvent;
