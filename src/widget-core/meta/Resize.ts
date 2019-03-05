import { Base } from './Base';
import Map from '../../shim/Map';
import ResizeObserver from '../../shim/ResizeObserver';

export interface ContentRect {
	readonly bottom: number;
	readonly height: number;
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly width: number;
	readonly x: number;
	readonly y: number;
}

export interface PredicateFunction {
	(contentRect: ContentRect): boolean;
}

export interface PredicateFunctions {
	[id: string]: PredicateFunction;
}

export type PredicateResponses<T = PredicateFunctions> = { [id in keyof T]: boolean };

export class Resize extends Base {
	private _details = new Map<string | number, PredicateResponses>();

	public get<T extends PredicateFunctions>(
		key: string | number,
		predicates = {} as PredicateFunctions
	): PredicateResponses<T> {
		const node = this.getNode(key);

		if (!node) {
			const defaultResponse: PredicateResponses = {};
			for (let predicateId in predicates) {
				defaultResponse[predicateId] = false;
			}
			return defaultResponse as PredicateResponses<T>;
		}

		if (!this._details.has(key)) {
			this._details.set(key, {});
			const resizeObserver = new ResizeObserver(([entry]) => {
				let predicateChanged = false;
				if (Object.keys(predicates).length) {
					const { contentRect } = entry;
					const previousDetails = this._details.get(key);
					let predicateResponses: PredicateResponses = {};

					for (let predicateId in predicates) {
						const response = predicates[predicateId](contentRect);
						predicateResponses[predicateId] = response;
						if (!predicateChanged && response !== previousDetails![predicateId]) {
							predicateChanged = true;
						}
					}

					this._details.set(key, predicateResponses);
				} else {
					predicateChanged = true;
				}
				predicateChanged && this.invalidate();
			});
			resizeObserver.observe(node);
			this.own({
				destroy: () => {
					resizeObserver.disconnect();
				}
			});
		}

		return this._details.get(key) as PredicateResponses<T>;
	}
}

export default Resize;
