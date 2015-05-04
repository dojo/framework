import QueuingStrategy from './QueuingStrategy';

export default class ByteLengthQueuingStrategy<T> extends QueuingStrategy<T> {
	size(chunk: T): number {
		if ((<any> chunk).byteLength !== undefined) {
			return (<any> chunk).byteLength;
		}
		else {
			// TODO: do we want to do byte size calculation of arbitrary values?
			return 1;
		}
	}
}
