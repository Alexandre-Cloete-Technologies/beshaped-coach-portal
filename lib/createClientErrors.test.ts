// Run with `npm test` (Node's built-in test runner; Node 22.18+ runs .ts directly).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createClientErrorMessage } from './createClientErrors.ts';

test('maps the callable messages the backend contract lists', () => {
  const err = { code: 'functions/already-exists', message: 'email-already-in-use' };
  assert.match(createClientErrorMessage(err), /already exists/);
  assert.match(createClientErrorMessage({ code: 'functions/invalid-argument', message: 'invalid-password' }), /6 to 128/);
  assert.match(createClientErrorMessage({ code: 'functions/permission-denied', message: 'coach-assigns-to-self' }), /own list/);
  assert.match(createClientErrorMessage({ code: 'functions/internal', message: 'create-failed' }), /nothing was saved/);
});

test('falls back to the Functions error code when the message is unknown', () => {
  assert.match(createClientErrorMessage({ code: 'functions/unavailable', message: 'offline' }), /Could not reach/);
  assert.match(createClientErrorMessage({ code: 'functions/unauthenticated', message: 'unauthenticated' }), /session/);
});

test('uses a generic message for anything else, never the raw error text', () => {
  const generic = 'Failed to add client. Please try again.';
  assert.equal(createClientErrorMessage(new Error('boom: internal detail')), generic);
  assert.equal(createClientErrorMessage({ code: 'functions/internal', message: 'internal' }), generic);
  assert.equal(createClientErrorMessage({ code: 'functions/__proto__', message: 'constructor' }), generic);
  assert.equal(createClientErrorMessage(undefined), generic);
});
