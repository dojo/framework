import global from '../global';
import has from '../../core/has';

export default function wrapper(nameOnGlobal: string, constructor = false, bind = false): any {
	if (has('test')) {
		if (constructor) {
			return function(...args: any[]) {
				return new global[nameOnGlobal](...args);
			};
		} else {
			return function(...args: any[]) {
				return global[nameOnGlobal](...args);
			};
		}
	}

	return bind ? global[nameOnGlobal].bind(global) : global[nameOnGlobal];
}
