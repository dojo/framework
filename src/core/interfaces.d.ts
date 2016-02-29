export interface EventObject {
	type: string;
}

export interface Handle {
	destroy(): void;
}

export interface Hash<T> {
	[ key: string ]: T;
}
