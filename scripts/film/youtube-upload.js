#!/usr/bin/env node
/*
 * Upload the finished film to YouTube via the YouTube Data API v3.
 *
 * Gated on the owner's own OAuth token: nothing is uploaded unless
 * secrets.YOUTUBE_TOKEN is set. The upload is the last owner-action step;
 * everything before it (MP4, SRT, thumbnail, brief) is produced by CI.
 *
 * Usage:
 *   node scripts/film/youtube-upload.js --film emergency-1975 \
 *     --token "$YOUTUBE_TOKEN"
 *
 * Steps:
 *   1. insert the MP4 (multipart, part=snippet,status)
 *   2. upload the thumbnail
 *   3. insert the captions from the SRT
 *
 * No paid API: this is the free YouTube Data API quota.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith('--') ? next : true;
}

function curl(args) {
  const r = spawnSync('curl', ['-fsS', '--retry', '2', ...args]);
  if (r.error) throw new Error(`curl failed to start: ${r.error.message}`);
  if (r.status !== 0) {
    throw new Error(`curl exited ${r.status}: ${r.stderr.toString().slice(-400)}`);
  }
  return r.stdout.toString();
}

function main() {
  const film = arg('film');
  if (!film) throw new Error('--film is required');
  const token = arg('token', process.env.YOUTUBE_TOKEN || '');
  if (!token) throw new Error('YOUTUBE_TOKEN is not set; skipping YouTube upload');

  const filmDir = path.join(ROOT, 'out', 'film', film);
  const mp4 = path.join(filmDir, `${film}.mp4`);
  const srt = path.join(filmDir, `${film}.srt`);
  const thumb = path.join(filmDir, `${film}-thumb.jpg`);
  const metadata = path.join(filmDir, 'metadata.json');

  if (!fs.existsSync(mp4)) throw new Error(`missing ${mp4}`);

  let title = `${film.replace(/-/g, ' ')}`;
  let description = 'A vlymbooq film — produced entirely on free archives and a local model. No paid APIs, nothing rendered on the owner’s machine.';
  if (fs.existsSync(metadata)) {
    const md = JSON.parse(fs.readFileSync(metadata, 'utf8'));
    if (md.title) title = md.title;
    if (md.description) description = md.description;
  }

  const body = JSON.stringify({
    snippet: {
      title,
      description,
      tags: ['vlymbooq', 'history', 'documentary'],
      categoryId: '22'
    },
    status: { privacyStatus: 'private', madeForKids: false, selfDeclaredMadeForKids: false }
  });

  console.log(`youtube-upload: inserting ${film}`);
  const resp = curl([
    '-H', `Authorization: Bearer ${token}`,
    '-F', `metadata=${body};type=application/json`,
    '-F', `video=@${mp4};type=video/mp4`,
    'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart'
  ]);
  const video = JSON.parse(resp);
  const videoId = video.id;
  if (!videoId) throw new Error('video id not returned: ' + resp.slice(-300));
  console.log('youtube-upload: video https://youtu.be/' + videoId);

  if (fs.existsSync(thumb)) {
    console.log(`youtube-upload: thumbnail`);
    curl([
      '-H', `Authorization: Bearer ${token}`,
      '-H', 'Content-Type: image/jpeg',
      `--data-binary`, `@${thumb}`,
      `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}`
    ]);
    console.log('youtube-upload: thumbnail set');
  }

  if (fs.existsSync(srt)) {
    console.log(`youtube-upload: captions`);
    const ins = JSON.parse(curl([
      '-H', `Authorization: Bearer ${token}`,
      '-H', 'Content-Type: application/json',
      '-d', JSON.stringify({ snippet: { videoId, language: 'en', name: 'English' } }),
      'https://www.googleapis.com/youtube/v3/captions?part=snippet'
    ]));
    if (!ins.id) throw new Error('caption id not returned');
    curl([
      '-H', `Authorization: Bearer ${token}`,
      '-H', 'Content-Type: text/vtt',
      '--data-binary', `@${srt}`,
      `https://www.googleapis.com/upload/youtube/v3/captions/${ins.id}?uploadType=media`
    ]);
    console.log('youtube-upload: captions set');
  }

  console.log(`youtube-upload: done https://youtu.be/${videoId}`);
  fs.mkdirSync(path.join(filmDir), { recursive: true });
  fs.writeFileSync(path.join(filmDir, 'youtube-upload.json'), JSON.stringify({ videoId, url: `https://youtu.be/${videoId}` }, null, 2));
}

main().catch((err) => {
  console.error(`youtube-upload: ${err.message}`);
  process.exitCode = 1;
});
