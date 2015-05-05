import { Strategy } from './interfaces';

export default class QueuingStrategy<T> implements Strategy<T> {
	highwaterMark: number;

	constructor(kwArgs: QueuingStrategy.KwArgs) {
		this.highwaterMark = kwArgs.highwaterMark;
	}
}

module QueuingStrategy {
	export interface KwArgs {
		highwaterMark: number;
	}
}
