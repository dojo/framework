export async function waitFor(callback: () => boolean, message: string = 'timed out waiting for something to happen', timeout = 1000) {
	const startTime = (new Date()).valueOf() / 1000;

	return new Promise((resolve, reject) => {
		function check() {
			const now = (new Date().valueOf()) / 1000;

			if (now - startTime > timeout) {
				reject(new Error(message));
				return;
			}

			if (callback()) {
				resolve();
			}
			else {
				setTimeout(check, 10);
			}
		}

		check();
	});
}
