import { handleDecorator } from './../WidgetBase';
import { BeforeProperties } from './../interfaces';

/**
 * Decorator that adds the function passed of target method to be run
 * in the `beforeProperties` lifecycle.
 */
export function beforeProperties(method: BeforeProperties): (target: any) => void;
export function beforeProperties(): (target: any, propertyKey: string) => void;
export function beforeProperties(method?: BeforeProperties) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator('beforeProperties', propertyKey ? target[propertyKey] : method);
	});
}

export default beforeProperties;
