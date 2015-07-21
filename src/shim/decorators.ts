import has from './has';

export function hasClass(feature: string, trueClass: Function, falseClass: Function): ClassDecorator {
	return function <T extends Function>(target: T): T {
		return <any> (has(feature) ? trueClass : falseClass);
	};
}
