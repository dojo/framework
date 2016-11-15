interface Pair<T> {
	value: T;
	size: number;
}

/**
 * This class is used internally by {@link ReadableStream} and {@link WritableStream} as a simple queue.
 * Each value in the queue includes a piece of metadata: the size of the value.
 */
export default class SizeQueue<T> {
	get totalSize(): number {
		let totalSize = 0;
		this._queue.forEach(function (pair) {
			totalSize += pair.size;
		});
		return totalSize;
	}

	get length(): number {
		return this._queue.length;
	}

	private _queue: Pair<T | undefined>[] = [];

	empty() {
		this._queue = [];
	}

	enqueue(value: T | undefined, size: number): void {
		this._queue.push({ value: value, size: size });
	}

	dequeue(): T | null | undefined {
		const pair = this._queue.shift();
		return pair ? pair.value : null;
	}

	peek(): T | null | undefined {
		const pair = this._queue[0];
		return pair ? pair.value : null;
	}
}
