'use strict';

/**
 * C-LIMID | Start All Processes (Dev convenience script)
 * ─────────────────────────────────────────────────────────────────────────────
 * Spawns both the Producer API and the Worker in a single terminal session.
 * Uses Node's child_process.spawn so each process keeps its own stdout/stderr.
 *
 * Usage:  npm run start:all
 *
 * In production, run producer and worker as separate processes / containers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { spawn } = require('child_process');
const path      = require('path');

const ROOT = path.join(__dirname, '..');

function spawnProcess(name, scriptPath, color) {
  const RESET  = '\x1b[0m';
  const prefix = `${color}[${name}]${RESET}`;

  const child = spawn('node', [scriptPath], {
    cwd:   ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env:   { ...process.env },
  });

  child.stdout.on('data', (data) =>
    process.stdout.write(`${prefix} ${data}`)
  );
  child.stderr.on('data', (data) =>
    process.stderr.write(`${prefix} ${data}`)
  );
  child.on('exit', (code) =>
    console.log(`${prefix} exited with code ${code}`)
  );

  return child;
}

// ANSI colour codes for visual separation in the terminal
const CYAN    = '\x1b[36m';
const YELLOW  = '\x1b[33m';

console.log('\n══════════════════════════════════════════════════');
console.log('  C-LIMID  |  Starting Producer + Worker');
console.log('══════════════════════════════════════════════════\n');

const producer = spawnProcess('Producer', 'src/producer.js', CYAN);
const worker   = spawnProcess('Worker',   'src/worker.js',   YELLOW);

// Propagate shutdown signals to children
function shutdown(signal) {
  console.log(`\n[start-all] ${signal} received — shutting down all processes…`);
  producer.kill(signal);
  worker.kill(signal);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
