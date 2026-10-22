import { spawn } from 'node:child_process';
import { constants, promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';

const requiredVariables = ['EXPO_TOKEN', 'EXPO_PROJECT_ID', 'ASC_APP_ID', 'ASC_KEY_ID', 'ASC_ISSUER_ID', 'ASC_API_KEY_PATH'];

export function validateEnvironment(env) {
  const missing = requiredVariables.filter(key => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing CI variables: ${missing.join(', ')}. See docs/ios-release.md.`);
  if (!/^\d+$/.test(env.ASC_APP_ID)) throw new Error('ASC_APP_ID must be the numeric App Store Connect Apple ID, not the bundle identifier.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.EXPO_PROJECT_ID)) throw new Error('EXPO_PROJECT_ID must be the EAS project UUID.');
}

export function submissionConfig(original, env) {
  return {
    ...original,
    submit: {
      ...original.submit,
      production: {
        ...original.submit?.production,
        ios: {
          ...original.submit?.production?.ios,
          ascAppId: env.ASC_APP_ID,
          appleTeamId: env.EXPO_APPLE_TEAM_ID || 'JKD484739B',
          ascApiKeyPath: env.ASC_API_KEY_PATH,
          ascApiKeyId: env.ASC_KEY_ID,
          ascApiKeyIssuerId: env.ASC_ISSUER_ID,
        },
      },
    },
  };
}

export function finishedIOSBuild(result) {
  const builds = Array.isArray(result) ? result : [result];
  const build = builds.find(value => value?.platform === 'IOS');
  if (!build?.id || build.status !== 'FINISHED') throw new Error('EAS did not return a finished iOS build. Nothing was submitted.');
  return build;
}

function eas(args, capture = false) {
  return new Promise((resolve, reject) => {
    // shell:false keeps credentials and metadata out of shell interpolation.
    const child = spawn('npx', ['--yes', 'eas-cli@latest', ...args], { stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'], shell: false });
    let output = '';
    if (capture) child.stdout.setEncoding('utf8').on('data', chunk => { output += chunk; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve(output) : reject(new Error(`EAS ${args[0]} failed (exit ${code}).`)));
  });
}

export async function release(env = process.env) {
  validateEnvironment(env);
  await fs.access(env.ASC_API_KEY_PATH, constants.R_OK);
  const key = await fs.readFile(env.ASC_API_KEY_PATH, 'utf8');
  if (!key.includes('-----BEGIN PRIVATE KEY-----')) throw new Error('ASC_API_KEY_PATH must point to a readable App Store Connect .p8 key (a temporary runner file).');
  const original = await fs.readFile('eas.json', 'utf8');
  const config = submissionConfig(JSON.parse(original), env);
  await fs.mkdir('release', { recursive: true });
  try {
    await fs.writeFile('eas.json', JSON.stringify(config, null, 2) + '\n');
    console.log('Starting signed production iOS build on EAS…');
    const output = await eas(['build', '--platform', 'ios', '--profile', 'production', '--non-interactive', '--wait', '--json'], true);
    const build = finishedIOSBuild(JSON.parse(output));
    const summary = {
      buildId: build.id,
      version: build.appVersion,
      buildNumber: build.appBuildVersion,
      commit: env.CI_COMMIT_SHA,
      buildUrl: `https://expo.dev/accounts/${build.project?.ownerAccount?.name || env.EXPO_OWNER || '_direct'}/projects/${build.project?.slug || 'spendlens'}/builds/${build.id}`,
      uploadStatus: 'pending',
    };
    await fs.writeFile('release/ios-build.json', JSON.stringify(summary, null, 2) + '\n');
    console.log(`Submitting this exact build to App Store Connect: ${build.id}`);
    await eas(['submit', '--platform', 'ios', '--profile', 'production', '--id', build.id, '--non-interactive', '--wait']);
    summary.uploadStatus = 'uploaded';
    await fs.writeFile('release/ios-build.json', JSON.stringify(summary, null, 2) + '\n');
    console.log('Uploaded to App Store Connect. App Review is a separate step after Apple finishes processing the build.');
  } finally {
    await fs.writeFile('eas.json', original);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  release().catch(error => { console.error(error.message); process.exitCode = 1; });
}
