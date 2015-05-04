import QueuingStrategy from './QueuingStrategy';

export default class CountQueuingStrategy<T> extends QueuingStrategy<T> {
	size(chunk: T): number {
		return 1;
	}
}
