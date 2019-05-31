import global from './global';
import has from '../core/has';
`!has('build-elide')`;
import * as Resize from 'resize-observer-polyfill';
import wrapper from './util/wrapper';

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
	observe(target: Element): void;
	unobserve(target: Element): void;
	disconnect(): void;
}

declare var ResizeObserver: {
	prototype: ResizeObserver;
	new (callback: ResizeObserverCallback): ResizeObserver;
};

if (!has('build-elide')) {
	if (!global.ResizeObserver) {
		// default is undefined when UMD module is used
		global.ResizeObserver = Resize.default || Resize;
	}
}

export default wrapper('ResizeObserver', true) as typeof ResizeObserver;
