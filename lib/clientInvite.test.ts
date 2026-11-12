// Run with `npm test` (Node's built-in test runner; Node 22.18+ runs .ts directly).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emailsMatch, inviteEmailErrorMessage } from './clientInvite.ts';

test('emailsMatch ignores case and surrounding spaces', () => {
  assert.equal(emailsMatch('Jo@Example.com', ' jo@example.com '), true);
});

test('emailsMatch rejects different or empty emails', () => {
  assert.equal(emailsMatch('jo@example.com', 'joe@example.com'), false);
  assert.equal(emailsMatch('', ''), false);
});

test('inviteEmailErrorMessage maps known Auth codes and hides everything else', () => {
  assert.match(inviteEmailErrorMessage({ code: 'auth/too-many-requests' }), /Too many/);
  assert.match(inviteEmailErrorMessage({ code: 'auth/network-request-failed' }), /connection/);
  const generic = 'The email could not be sent. Please try again.';
  assert.equal(inviteEmailErrorMessage(new Error('secret detail')), generic);
  assert.equal(inviteEmailErrorMessage({ code: 'auth/__proto__' }), generic);
  assert.equal(inviteEmailErrorMessage(undefined), generic);
});
