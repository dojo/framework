import { handleDecorator } from './handleDecorator';
import { DiffPropertyFunction } from './../interfaces';

/**
 * Decorator that can be used to register a function as a specific property diff
 *
 * @param propertyName  The name of the property of which the diff function is applied
 * @param diffType      The diff type, default is DiffType.AUTO.
 * @param diffFunction  A diff function to run if diffType if DiffType.CUSTOM
 */
export function diffProperty(propertyName: string, diffFunction: DiffPropertyFunction, reactionFunction?: Function) {
	return handleDecorator((target, propertyKey) => {
		target.addDecorator(`diffProperty:${propertyName}`, diffFunction.bind(null));
		target.addDecorator('registeredDiffProperty', propertyName);
		if (reactionFunction || propertyKey) {
			target.addDecorator('diffReaction', {
				propertyName,
				reaction: propertyKey ? target[propertyKey] : reactionFunction
			});
		}
	});
}

export default diffProperty;
