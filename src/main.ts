import './hooks.js';
import './loader.js';
import { modules } from './loader.js';
import { logger } from './utils/main.js';

import.meta.env.DEV && logger.asLevel('Important', modules);
