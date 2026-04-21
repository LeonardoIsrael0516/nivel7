import './modules/queue/worker.js';

// Worker process starts by importing queue workers.
// Keep process alive.
setInterval(() => {}, 1 << 30);
