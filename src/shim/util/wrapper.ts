import global from '../global';
import has from '../../has/has';

export default function wrapper(nameOnGlobal: string, constructor = false): any {
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

	return global[nameOnGlobal].bind(global);
}
