import createRoute from './createRoute';
export { createRoute };

import createRouter from './createRouter';
export { createRouter };

import createHashHistory, { HashHistoryFactory } from './history/createHashHistory';
import createMemoryHistory, { MemoryHistoryFactory } from './history/createMemoryHistory';
import createStateHistory, { StateHistoryFactory } from './history/createStateHistory';

export const history = {
	createHashHistory,
	createMemoryHistory,
	createStateHistory
};

export { HashHistoryFactory, MemoryHistoryFactory, StateHistoryFactory };
