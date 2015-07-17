import load from '../../../src/load';

export const succeed = load(require, './a', './b');
export const fail = load(require, './a', './c');

export const globalSucceed = load('fs', 'path');
export const globalFail = load('fs', './a');
