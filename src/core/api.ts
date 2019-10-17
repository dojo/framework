import global from '../shim/global';

global.__DOJO_SCOPE = '';

// @ts-ignore
const scope = __DOJO_SCOPE;

if (!global[scope]) {
	global[scope] = {};
}

export function setRendering(value: boolean) {
	global[scope].rendering = value;
}

export function incrementBlockCount() {
	const blocksPending = global[scope].blocksPending || 0;
	global[scope].blocksPending = blocksPending + 1;
}

export function decrementBlockCount() {
	const blocksPending = global[scope].blocksPending || 0;
	global[scope].blocksPending = blocksPending - 1;
}

export function registerBtrPath(path: string) {
	const paths = global[scope].paths || [];
	paths.push(path);
	global[scope].paths = paths;
}
