import global from '../shim/global';

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

export function registerBtrPath(path: string | string[]) {
	const paths = Array.isArray(path) ? path : [path];
	const currentPaths = global[scope].btrPaths || [];
	global[scope].btrPaths = [...currentPaths, ...paths];
}
