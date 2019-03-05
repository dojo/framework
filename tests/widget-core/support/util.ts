import global from '../../../src/shim/global';
import Promise from '../../../src/shim/Promise';
import loadCldrData from '../../../src/i18n/cldr/load';
import { systemLocale } from '../../../src/i18n/i18n';
import likelySubtags from './likelySubtags';
import { stub, SinonStub } from 'sinon';

/**
 * Load into Globalize.js all CLDR data for the specified locales.
 */
export function fetchCldrData(): Promise<void[]> {
	return Promise.all([
		// this weird dummy load is needed by i18n right now
		loadCldrData({
			main: {
				[systemLocale]: {}
			}
		}),
		loadCldrData(likelySubtags)
	]);
}

export function createResolvers() {
	let rAFStub: SinonStub;
	let rICStub: SinonStub;

	function resolveRAFCallbacks() {
		for (let i = 0; i < rAFStub.callCount; i++) {
			rAFStub.getCall(i).callArg(0);
		}
		rAFStub.resetHistory();
	}

	function resolveRICCallbacks() {
		for (let i = 0; i < rICStub.callCount; i++) {
			rICStub.getCall(i).callArg(0);
		}
		rICStub.resetHistory();
	}

	return {
		resolve() {
			resolveRAFCallbacks();
			resolveRICCallbacks();
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
			} else {
				rICStub = stub(global, 'setTimeout').returns(1);
			}
		},
		restore() {
			rAFStub.restore();
			rICStub.restore();
		}
	};
}
