import global from './global';
import has from '../../src/has/has';
`!has('build-elide')`;
import ResizeObserver from 'resize-observer-polyfill';

if (!has('build-elide')) {
	if (!global.ResizeObserver) {
		global.ResizeObserver = ResizeObserver;
	}
}

export default global.ResizeObserver as typeof ResizeObserver;
