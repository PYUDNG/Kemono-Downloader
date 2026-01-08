import App from './App.vue';
import { createDialog, logger } from './utils/main.js';
import { styling } from './styling';

createDialog(App);

logger.log('Info', 'raw', 'log', styling);