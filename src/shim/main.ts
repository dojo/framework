import './tslib';

import * as array from './array';
import * as iterator from './iterator';
import Map from './Map';
import * as math from './math';
import * as number from './number';
import * as object from './object';
import Set from './Set';
import * as string from './string';
import Symbol from './Symbol';
import WeakMap from './WeakMap';

`!has('es6-promise')`;
import './Promise';

`!has('es6-symbol')`;
import './Symbol';

export {
	array,
	iterator,
	Map,
	math,
	number,
	object,
	Set,
	string,
	Symbol,
	WeakMap
};
