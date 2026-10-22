import assert from 'node:assert/strict';
import test from 'node:test';
import { finishedIOSBuild, submissionConfig, validateEnvironment } from '../scripts/ci/ios-release.mjs';

const environment = {
  EXPO_TOKEN: 'test-token', EXPO_PROJECT_ID: '11111111-1111-1111-1111-111111111111',
  ASC_APP_ID: '1234567890', ASC_KEY_ID: 'TESTKEY', ASC_ISSUER_ID: 'test-issuer', ASC_API_KEY_PATH: '/tmp/test-key.p8',
};

test('release fails before building when CI credentials or app identifiers are missing', () => {
  assert.throws(() => validateEnvironment({}), /Missing CI variables/);
  assert.throws(() => validateEnvironment({ ...environment, ASC_APP_ID: 'app.spendlens.mobile' }), /numeric App Store Connect Apple ID/);
  assert.throws(() => validateEnvironment({ ...environment, EXPO_PROJECT_ID: 'spendlens' }), /project UUID/);
  assert.doesNotThrow(() => validateEnvironment(environment));
});

test('submission points at the configured Apple app and retains other EAS profiles', () => {
  const original = { build: { production: { autoIncrement: true } }, submit: { preview: {}, production: { ios: { language: 'de-DE' } } } };
  const result = submissionConfig(original, environment);
  assert.equal(result.submit.production.ios.ascAppId, environment.ASC_APP_ID);
  assert.equal(result.submit.production.ios.ascApiKeyPath, environment.ASC_API_KEY_PATH);
  assert.deepEqual(result.build, original.build);
  assert.deepEqual(result.submit.preview, {});
  assert.equal(result.submit.production.ios.language, 'de-DE');
  assert.equal('ascAppId' in original.submit.production.ios, false);
});

test('only the completed iOS build from this run can be submitted', () => {
  assert.equal(finishedIOSBuild([{ id: 'android', platform: 'ANDROID', status: 'FINISHED' }, { id: 'this-ios-build', platform: 'IOS', status: 'FINISHED' }]).id, 'this-ios-build');
  for (const result of [[], { id: 'failed', platform: 'IOS', status: 'ERRORED' }, { id: 'pending', platform: 'IOS', status: 'IN_PROGRESS' }, { id: 'android', platform: 'ANDROID', status: 'FINISHED' }]) {
    assert.throws(() => finishedIOSBuild(result), /Nothing was submitted/);
  }
});
