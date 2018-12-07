import global from './global';
import has from '../has/has';
`!has('build-elide')`;
import Resize from 'resize-observer-polyfill';

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
		global.ResizeObserver = Resize;
	}
}

export default global.ResizeObserver as ResizeObserver;
