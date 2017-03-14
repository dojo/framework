import load from '../../../src/load';
import { useDefault } from '../../../src/load/util';
import { Require } from '@dojo/interfaces/loader';

declare const require: Require;

export const succeed = load(require, './a', './b');
export const succeedDefault = load(require, './a', './b').then(useDefault);
export const fail = load(require, './a', './nonexistent');

export const globalSucceed = load('fs', 'path');
export const globalFail = load('fs', './a');
