import DPromise from '../../../src/shim/Promise';

export default async function main(callback: (n: number) => void) {
	function reallyGetNumber() {
		return DPromise.resolve(21);
	}

	async function getNumber() {
		const num = await reallyGetNumber();
		return num * 2;
	}

	const result = await getNumber();

	callback(result);
}
