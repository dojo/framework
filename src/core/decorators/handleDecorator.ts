export type DecoratorHandler = (target: any, propertyKey?: string) => void;

/**
 * Generic decorator handler to take care of whether or not the decorator was called at the class level
 * or the method level.
 *
 * @param handler
 */
export function handleDecorator(handler: DecoratorHandler) {
	return function(target: any, propertyKey?: string, descriptor?: PropertyDescriptor) {
		if (typeof target === 'function') {
			handler(target.prototype, undefined);
		} else {
			handler(target, propertyKey);
		}
	};
}

export default handleDecorator;
