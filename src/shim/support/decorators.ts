import has from './has';

/**
 * A class decorator that provides either a native class or a shimmed class based on a feature
 * test
 * @param feature The has feature to check
 * @param trueClass The class to use if feature test returns `true`
 * @param falseClass The class to use if the feature test returns `false` or is not defined
 */
export function hasClass(feature: string, trueClass: Function, falseClass: Function): ClassDecorator {
	return function(target: Function) {
		/* Return type generics aren't catching the fact that Function is assignable to the generic */
		return (has(feature) ? trueClass : falseClass) as any;
	};
}
