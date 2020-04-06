import global from '../../../src/shim/global';
import { stub, SinonStub } from 'sinon';

export function createResolvers() {
	let rAFStub: SinonStub;
	let rICStub: SinonStub;
	let timeoutStub: SinonStub;

	function resolveRAFCallbacks() {
		const calls = rAFStub.getCalls();
		rAFStub.resetHistory();
		for (let i = 0; i < calls.length; i++) {
			calls[i].callArg(0);
		}
	}

	function resolveRICCallbacks() {
		const calls = rICStub.getCalls();
		rICStub.resetHistory();
		for (let i = 0; i < calls.length; i++) {
			calls[i].callArg(0);
		}
	}

	function resolveTimeoutCallbacks() {
		if (timeoutStub) {
			const calls = timeoutStub.getCalls();
			timeoutStub.resetHistory();
			for (let i = 0; i < calls.length; i++) {
				calls[i].callArg(0);
			}
		}
	}

	return {
		resolve() {
			resolveRAFCallbacks();
			resolveRICCallbacks();
			resolveTimeoutCallbacks();
		},
		resolveRIC() {
			resolveRICCallbacks();
		},
		resolveRAF() {
			resolveRAFCallbacks();
		},
		stub() {
			rAFStub = stub(global, 'requestAnimationFrame').returns(1);
			if (global.requestIdleCallback) {
				rICStub = stub(global, 'requestIdleCallback').returns(1);
				timeoutStub = stub(global, 'setTimeout').returns(1);
			} else {
				rICStub = stub(global, 'setTimeout').returns(1);
			}
		},
		restore() {
			rAFStub.restore();
			rICStub.restore();

			if (timeoutStub) {
				timeoutStub.restore();
			}
		}
	};
}
