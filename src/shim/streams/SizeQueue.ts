interface Pair<T> {
	value: T;
	size: number;
}

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

	private _queue: Pair<T>[] = [];

	empty() {
		this._queue = [];
	}

	enqueue(value: T, size: number): void {
		this._queue.push({ value: value, size: size });
	}

	dequeue(): T {
		const pair = this._queue.shift();
		return pair.value;
	}

	peek(): T {
		const pair = this._queue[0];
		return pair.value;
	}
}
