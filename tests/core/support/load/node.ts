import load from '../../../../src/core/load';
import { useDefault } from '../../../../src/core/load/util';
import { Require } from '../../../../src/core/load';

declare const require: Require;

export const succeed = load.bind(null, require, './a', './b');
export const succeedDefault = () => {
	return load(require, './a', './b').then(useDefault);
};
export const fail = load.bind(null, require, './a', './nonexistent');

export const globalSucceed = load.bind(null, 'fs', 'path');
export const globalFail = load.bind(null, 'fs', './a');
