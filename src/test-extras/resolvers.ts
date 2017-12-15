import global from '@dojo/shim/global';
import { stub, SinonStub } from 'sinon';

export interface Resolvers {
	stub(): void;
	resolve(): void;
	restore(): void;
}

export function createResolvers() {
	let rAFStub: SinonStub;
	let rICStub: SinonStub;

	function resolveRAF() {
		for (let i = 0; i < rAFStub.callCount; i++) {
			rAFStub.getCall(i).args[0]();
		}
		rAFStub.reset();
	}

	function resolveRIC() {
		for (let i = 0; i < rICStub.callCount; i++) {
			rICStub.getCall(i).args[0]();
		}
		rICStub.reset();
	}

	return {
		resolve() {
			resolveRAF();
			resolveRIC();
		},
		stub() {
			rAFStub = stub(global, 'requestAnimationFrame').returns(1);
			if (global.requestIdleCallback) {
				rICStub = stub(global, 'requestIdleCallback').returns(1);
			}
			else {
				rICStub = stub(global, 'setTimeout').returns(1);
			}
		},
		restore() {
			rAFStub.restore();
			rICStub.restore();
		}
	};
}
