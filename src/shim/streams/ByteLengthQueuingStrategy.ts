import QueuingStrategy from './QueuingStrategy';
import { getApproximateByteSize } from './util';

export default class ByteLengthQueuingStrategy<T> extends QueuingStrategy<T> {
	size(chunk: T): number {
		if ((<any> chunk).byteLength !== undefined) {
			return (<any> chunk).byteLength;
		}
		else {
			return getApproximateByteSize(chunk);
		}
	}
}
