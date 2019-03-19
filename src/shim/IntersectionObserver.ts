import global from './global';
`!has('build-elide')`;
import 'intersection-observer';
import has from '../has/has';

const _intersectionObserver: typeof IntersectionObserver = global.IntersectionObserver as typeof IntersectionObserver;
let replacement: typeof IntersectionObserver = _intersectionObserver;

const Wrapper = class {
	constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		return new replacement(callback, options) as any;
	}

	readonly root: Element | null;
	readonly rootMargin: string;
	readonly thresholds: number[];
	disconnect: () => void;
	observe: (target: Element) => void;
	takeRecords: () => IntersectionObserverEntry[];
	unobserve: (target: Element) => void;
};
export default Wrapper as typeof IntersectionObserver;

export function replace(_intersectionObserver: typeof IntersectionObserver): () => void {
	if (has('test')) {
		replacement = _intersectionObserver;
		return () => {
			replacement = global.IntersectionObserver as typeof IntersectionObserver;
		};
	} else {
		throw new Error('Replacement functionality is only available in a test environment');
	}
}
