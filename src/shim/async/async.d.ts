import Promise from './Promise';

export interface Identity<T> {
	(value: T): Promise<T>;
}
