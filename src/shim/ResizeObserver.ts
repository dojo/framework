import global from './global';
import has from '../has/has';
`!has('build-elide')`;
import * as Resize from 'resize-observer-polyfill';

export interface DOMRectReadOnly {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
	readonly left: number;
}

export interface ResizeObserverCallback {
	(entries: ResizeObserverEntry[], observer: ResizeObserver): void;
}

export interface ResizeObserverEntry {
	readonly target: Element;
	readonly contentRect: DOMRectReadOnly;
}

export interface ResizeObserver {
	prototype: ResizeObserver;
	new (callback: ResizeObserverCallback): ResizeObserver;
	observe(target: Element): void;
	unobserve(target: Element): void;
	disconnect(): void;
}

if (!has('build-elide')) {
	if (!global.ResizeObserver) {
		// default is undefined when UMD module is used
		global.ResizeObserver = Resize.default || Resize;
	}
}

const _ResizeObserver = global.ResizeObserver as ResizeObserver;
let replacement: ResizeObserver = _ResizeObserver;

const Wrapper = class {
	constructor(callback: ResizeObserverCallback) {
		return new replacement(callback) as any;
	}

	observe(target: Element) {
		return replacement.observe(target);
	}

	unobserve(target: Element) {
		return replacement.unobserve(target);
	}

	disconnect() {
		replacement.disconnect();
	}
};

export default Wrapper as ResizeObserver;

export function replace(_ResizeObserver: ResizeObserver): () => void {
	if (has('test')) {
		replacement = _ResizeObserver;
		return () => {
			replacement = global.ResizeObserver as ResizeObserver;
		};
	} else {
		throw new Error('Replacement functionality is only available in a test environment');
	}
}
