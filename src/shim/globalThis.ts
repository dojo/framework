import global from './global';
import has from '../core/has';

if (!has('global-this')) {
	global.globalThis = global;
}
