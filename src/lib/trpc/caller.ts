import { createCallerFactory } from './init.ts';
import { appRouter } from './router.ts';

const createCaller = createCallerFactory(appRouter);

export { createCaller };
