import WeakMap from '../../shim/WeakMap';
import IntersectionObserver from '../../shim/IntersectionObserver';
import { create, node, invalidator, destroy } from '../vdom';
import cache from './cache';
import {
	IntersectionResult,
	IntersectionGetOptions,
	IntersectionDetail,
	ExtendedIntersectionObserverEntry
} from '../meta/Intersection';

const defaultIntersection: IntersectionResult = Object.freeze({
	intersectionRatio: 0,
	isIntersecting: false
});

const factory = create({ cache, node, invalidator, destroy });

export const intersection = factory(({ middleware: { cache, node, invalidator, destroy } }) => {
	const handles: Function[] = [];
	destroy(() => {
		let handle: any;
		while ((handle = handles.pop())) {
			handle && handle();
		}
	});

	function _createDetails(options: IntersectionGetOptions, rootNode?: HTMLElement): IntersectionDetail {
		const entries = new WeakMap<HTMLElement, ExtendedIntersectionObserverEntry>();
		const observer = new IntersectionObserver(_onIntersect(entries), {
			...options,
			root: rootNode
		});
		const details = { observer, entries, ...options };
		cache.set(JSON.stringify(options), details);
		handles.push(() => observer.disconnect());
		return details;
	}

	function _getDetails(options: IntersectionGetOptions = {}): IntersectionDetail | undefined {
		return cache.get(JSON.stringify(options));
	}

	function _onIntersect(detailEntries: WeakMap<Element, IntersectionResult>) {
		return (entries: ExtendedIntersectionObserverEntry[]) => {
			for (const { intersectionRatio, isIntersecting, target } of entries) {
				detailEntries.set(target, { intersectionRatio, isIntersecting });
			}
			invalidator();
		};
	}

	return {
		get(key: string | number, options: IntersectionGetOptions = {}): IntersectionResult {
			let rootNode: HTMLElement | undefined;
			if (options.root) {
				rootNode = node.get(options.root) as HTMLElement;
				if (!rootNode) {
					return defaultIntersection;
				}
			}
			const domNode = node.get(key) as HTMLElement | null;
			if (!domNode) {
				return defaultIntersection;
			}

			let details = _getDetails(options) || _createDetails(options, rootNode);
			if (!details.entries.get(domNode)) {
				details.entries.set(domNode, defaultIntersection);
				details.observer.observe(domNode);
			}

			return details.entries.get(domNode) || defaultIntersection;
		}
	};
});

export default intersection;
