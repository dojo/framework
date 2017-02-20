import Route from './Route';
export { Route };

import Router from './Router';
export { Router };

import HashHistory from './history/HashHistory';
import MemoryHistory from './history/MemoryHistory';
import StateHistory from './history/StateHistory';

export const history = {
	HashHistory,
	MemoryHistory,
	StateHistory
};
