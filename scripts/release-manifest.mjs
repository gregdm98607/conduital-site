import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
	deriveReleaseMetadata,
	serializeReleaseMetadata,
} from './release-metadata.mjs';

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, 'src', 'data', 'release-manifest.json');
const mode = process.argv[2] ?? '--check';
const metadata = await deriveReleaseMetadata(projectRoot);
const serialized = serializeReleaseMetadata(metadata);

if (mode === '--write') {
	await writeFile(manifestPath, serialized, 'utf8');
	console.log(`Updated release manifest for Conduital ${metadata.version}.`);
} else if (mode === '--check') {
	const current = await readFile(manifestPath, 'utf8');
	assert.equal(
		current,
		serialized,
		'Release manifest is stale. Run `npm run release:manifest` and review the result.',
	);
	console.log(
		`Verified ${metadata.fileName}: ${metadata.bytes} bytes, ${metadata.sha256}.`,
	);
} else {
	throw new Error(`Unknown mode ${mode}; expected --check or --write.`);
}
