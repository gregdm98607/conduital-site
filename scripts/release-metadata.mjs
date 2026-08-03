import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const LATEST_DOWNLOAD_PATH = '/download/latest';
const INSTALLER_NAME = /^ConduitalSetup-(\d+\.\d+\.\d+)\.exe$/;

async function sha256(filePath) {
	const hash = createHash('sha256');
	for await (const chunk of createReadStream(filePath)) {
		hash.update(chunk);
	}
	return hash.digest('hex').toUpperCase();
}

export async function deriveReleaseMetadata(projectRoot = process.cwd()) {
	const vercelConfig = JSON.parse(
		await readFile(path.join(projectRoot, 'vercel.json'), 'utf8'),
	);
	const redirects = vercelConfig.redirects ?? [];
	const latestRedirect = redirects.find(
		(redirect) => redirect.source === LATEST_DOWNLOAD_PATH,
	);

	if (!latestRedirect?.destination?.startsWith('/downloads/')) {
		throw new Error(
			`${LATEST_DOWNLOAD_PATH} must redirect to an installer under /downloads/.`,
		);
	}

	const fileName = path.posix.basename(latestRedirect.destination);
	const versionMatch = fileName.match(INSTALLER_NAME);
	if (!versionMatch) {
		throw new Error(
			`Latest download must use the ConduitalSetup-x.y.z.exe naming convention; received ${fileName}.`,
		);
	}

	const version = versionMatch[1];
	const versionedRedirect = redirects.find(
		(redirect) => redirect.source === `/download/v${version}`,
	);
	if (versionedRedirect?.destination !== latestRedirect.destination) {
		throw new Error(
			`/download/v${version} must redirect to ${latestRedirect.destination}.`,
		);
	}

	const downloadsRoot = path.resolve(projectRoot, 'public', 'downloads');
	const artifactPath = path.resolve(
		projectRoot,
		'public',
		...latestRedirect.destination.split('/').filter(Boolean),
	);
	if (!artifactPath.startsWith(`${downloadsRoot}${path.sep}`)) {
		throw new Error('Latest download destination escapes public/downloads/.');
	}
	const artifactStats = await stat(artifactPath);
	if (!artifactStats.isFile()) {
		throw new Error(`${latestRedirect.destination} is not a file.`);
	}

	return {
		version,
		fileName,
		downloadPath: LATEST_DOWNLOAD_PATH,
		artifactPath: latestRedirect.destination,
		bytes: artifactStats.size,
		sizeLabel: `${(artifactStats.size / 1_000_000).toFixed(2)} MB`,
		sha256: await sha256(artifactPath),
	};
}

export function serializeReleaseMetadata(metadata) {
	return `${JSON.stringify(metadata, null, 2)}\n`;
}
