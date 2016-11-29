const globalObject: any = (typeof global === 'undefined') ? Function('return this')() : global;

// global spec defines a reference to the global object called 'global'
// https://github.com/tc39/proposal-global
if (!('global' in globalObject)) {
	globalObject.global = globalObject;
}

export default globalObject;
