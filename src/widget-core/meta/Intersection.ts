import global from '@dojo/shim/global';
import WeakMap from '@dojo/shim/WeakMap';
import Map from '@dojo/shim/Map';
import { createHandle } from '@dojo/core/lang';
import { Base } from './Base';

import 'intersection-observer';

interface ExtendedIntersectionObserverEntry extends IntersectionObserverEntry {
	readonly isIntersecting: boolean;
}

interface IntersectionDetail extends IntersectionGetOptions {
	entries: WeakMap<Element, IntersectionResult>;
	observer: IntersectionObserver;
}

export interface IntersectionGetOptions {
	root?: string;
	rootMargin?: string;
	threshold?: number[];
}

export interface IntersectionResult {
	intersectionRatio: number;
	isIntersecting: boolean;
}

const defaultIntersection: IntersectionResult = Object.freeze({
	intersectionRatio: 0,
	isIntersecting: false
});

export class Intersection extends Base {
	private readonly _details = new Map<string, IntersectionDetail>();

	/**
	 * Return an `InteractionResult` for the requested key and options.
	 *
	 * @param key The key to return the intersection meta for
	 * @param options The options for the request
	 */
	public get(key: string | number, options: IntersectionGetOptions = {}): IntersectionResult {
		let rootNode: HTMLElement | undefined;
		if (options.root) {
			rootNode = this.getNode(options.root) as HTMLElement;
			if (!rootNode) {
				return defaultIntersection;
			}
		}
		const node = this.getNode(key);
		if (!node) {
			return defaultIntersection;
		}

		let details = this._getDetails(options) || this._createDetails(options, rootNode);
		if (!details.entries.get(node)) {
			details.entries.set(node, defaultIntersection);
			details.observer.observe(node);
		}

		return details.entries.get(node) || defaultIntersection;
	}

	/**
	 * Returns true if the node for the key has intersection details
	 *
	 * @param key The key to return the intersection meta for
	 * @param options The options for the request
	 */
	public has(key: string | number, options?: IntersectionGetOptions): boolean {
		const node = this.getNode(key);
		const details = this._getDetails(options);
		return Boolean(details && node && details.entries.has(node));
	}

	private _createDetails(options: IntersectionGetOptions, rootNode?: HTMLElement): IntersectionDetail {
		const entries = new WeakMap<HTMLElement, ExtendedIntersectionObserverEntry>();
		const observer = new global.IntersectionObserver(this._onIntersect(entries), { ...options, root: rootNode });
		const details = { observer, entries, ...options };

		this._details.set(JSON.stringify(options), details);
		this.own(createHandle(observer.disconnect));
		return details;
	}

	private _getDetails(options: IntersectionGetOptions = {}): IntersectionDetail | undefined {
		return this._details.get(JSON.stringify(options));
	}

	private _onIntersect = (detailEntries: WeakMap<Element, IntersectionResult>) => {
		return (entries: ExtendedIntersectionObserverEntry[]) => {
			for (const { intersectionRatio, isIntersecting, target } of entries) {
				detailEntries.set(target, { intersectionRatio, isIntersecting });
			}
			this.invalidate();
		};
	}
}

export default Intersection;
