interface Identity<T> {
	(value: T): Promise<T>;
}
