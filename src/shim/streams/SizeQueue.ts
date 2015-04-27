interface Pair<T> {
	value: T;
	size: number;
}

export default class SizeQueue<T> {
	private _queue: Pair<T>[] = [];

	dequeue(): T {
		const pair = this._queue.shift();
		return pair.value;
	}

	enqueue(value: T, size: number): void {
		this._queue.push({ value: value, size: size });
	}

	empty() {
		this._queue = [];
	}

	peek(): T {
		const pair = this._queue[0];
		return pair.value;
	}

	get totalSize(): number {
		let totalSize = 0;
		this._queue.forEach(pair => totalSize += pair.size);
		return totalSize;
	}

	get length(): number {
		return this._queue.length;
	}
}
