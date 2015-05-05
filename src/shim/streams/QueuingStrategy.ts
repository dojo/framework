import { Strategy } from './interfaces';

export default class QueuingStrategy<T> implements Strategy<T> {
	highWaterMark: number;

	constructor(kwArgs: QueuingStrategy.KwArgs) {
		this.highWaterMark = kwArgs.highWaterMark;
	}
}

module QueuingStrategy {
	export interface KwArgs {
		highWaterMark: number;
	}
}
