import Promise from './Promise';

export default function delay<T>(milliseconds: number): Identity<T> {
	return function (value: T): Promise<T> {
		return new Promise(function (resolve) {
			setTimeout(function () {
				resolve(value);
			}, milliseconds)
		});
	};
}
