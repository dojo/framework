`!has('dom-css-variables')`;
import * as cssVars from 'css-vars-ponyfill';

export default (typeof cssVars !== 'undefined' && typeof cssVars.default === 'function'
	? cssVars.default
	: ((() => {}) as typeof cssVars.default));
