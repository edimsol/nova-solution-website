"""Create silent, small H.264 website loops from the six Higgsfield originals.

Requires OpenCV, NumPy, Pillow and a full FFmpeg with libx264. No source image
or preservation snapshot is modified. Supply the encoder with --ffmpeg.
"""
import argparse
import hashlib
import json
import math
import subprocess
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from reference_paths import ROOT, DOCS_ROOT, manifest_path

REPORT = DOCS_ROOT / 'renewal/motion-backgrounds'
OUTPUT = ROOT / 'assets/backgrounds/prism/video'
SCENES = ('hero', 'solutions', 'company', 'technology', 'industries', 'contact')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_frames(path):
    capture = cv2.VideoCapture(str(path))
    fps = capture.get(cv2.CAP_PROP_FPS)
    frames = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        frames.append(frame)
    capture.release()
    if not frames or not fps:
        raise RuntimeError(f'Cannot decode {path}')
    return frames, fps


def encode(ffmpeg, path, frames, width):
    height = round(frames[0].shape[0] * width / frames[0].shape[1] / 2) * 2
    command = [ffmpeg, '-hide_banner', '-loglevel', 'error', '-y',
               '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{width}x{height}',
               '-r', '24', '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow',
               '-threads', '2', '-profile:v', 'main', '-level:v', '3.1',
               '-pix_fmt', 'yuv420p', '-crf', '26' if width == 1280 else '28',
               '-maxrate', '1200k' if width == 1280 else '500k',
               '-bufsize', '2400k' if width == 1280 else '1000k',
               '-g', '48', '-keyint_min', '24', '-movflags', '+faststart',
               '-map_metadata', '-1', str(path)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        for frame in frames:
            scaled = cv2.resize(frame, (width, height), interpolation=cv2.INTER_AREA)
            process.stdin.write(scaled.tobytes())
        process.stdin.close()
        error = process.stderr.read().decode('utf-8', errors='replace')
        if process.wait() != 0:
            raise RuntimeError(error)
    finally:
        if process.poll() is None:
            process.kill()
    data = path.read_bytes()
    if not 0 < data.find(b'moov') < data.find(b'mdat'):
        raise RuntimeError(f'Faststart missing: {path}')
    probe = subprocess.run([ffmpeg, '-hide_banner', '-i', str(path), '-f', 'null', '-'],
                           capture_output=True, text=True)
    if probe.returncode or 'Audio:' in probe.stderr or 'h264 (Main)' not in probe.stderr:
        raise RuntimeError(f'Codec/audio validation failed: {probe.stderr}')
    decoded, fps = read_frames(path)
    changes = [float(np.mean(cv2.absdiff(a, b))) for a, b in zip(decoded, decoded[1:])]
    return {'file': path.relative_to(ROOT).as_posix(), 'width': width, 'height': height,
            'frames': len(decoded), 'fps': fps, 'durationSeconds': len(decoded) / fps,
            'bytes': len(data), 'sha256': sha(path), 'codec': 'H.264 Main Level 3.1',
            'pixelFormat': 'yuv420p', 'audioTracks': 0, 'faststart': True,
            'loopBoundaryMeanAbsolutePixelDifference': float(np.mean(cv2.absdiff(decoded[-1], decoded[0]))),
            'typicalFrameMeanAbsolutePixelDifference': float(np.median(changes)),
            'maxFrameMeanAbsolutePixelDifference': max(changes)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True)
    parser.add_argument('--scenes', nargs='+', default=list(SCENES), choices=SCENES)
    parser.add_argument('--duration', type=float, default=10, help='Requested input and output duration in seconds')
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest_file = REPORT / 'video-manifest.json'
    manifest = json.loads(manifest_file.read_text()) if manifest_file.exists() else {
        'date': '2026-10-09', 'generator': 'Higgsfield / FLUX 3 Video',
        'processing': '24 fps; last/first 0.5 second overlap with ease-in-out dissolve; silent H.264 Main 3.1; faststart',
        'batterySavingsMeasured': False, 'scenes': {}}
    if args.duration < 2:
        raise ValueError('The loop must be at least two seconds long')
    frame_count = round(args.duration * 24)
    manifest['processing'] = '24 fps; last/first 0.5 second ease-in-out dissolve; cyclic interpolation to requested duration; silent H.264 Main 3.1; faststart'
    manifest['requestedDurationSeconds'] = args.duration
    for name in args.scenes:
        path = REPORT / 'originals' / f'{name}.mp4'
        frames, fps = read_frames(path)
        if len(frames) / fps < args.duration - 0.1:
            raise RuntimeError(f'{name} is shorter than the requested source duration')
        # Remove optional extra end frames before joining the cycle.
        selected = [frames[min(round(i * fps / 24), len(frames)-1)] for i in range(frame_count)]
        overlap = 12
        tail, head = selected[-overlap:], selected[:overlap]
        blended = []
        for index, (a, b) in enumerate(zip(tail, head)):
            weight = (1 - math.cos(math.pi * index / (overlap - 1))) / 2
            blended.append(cv2.addWeighted(a, 1-weight, b, weight, 0))
        joined = selected[overlap:-overlap] + blended
        # The overlap shortens a cycle by 0.5s. Restore exactly ten seconds with
        # gentle cyclic frame interpolation, without a frozen tail or abrupt cut.
        loop = []
        for index in range(frame_count):
            phase = index * len(joined) / frame_count
            before = math.floor(phase)
            weight = phase - before
            loop.append(cv2.addWeighted(joined[before], 1-weight, joined[(before+1) % len(joined)], weight, 0))
        output = [encode(args.ffmpeg, OUTPUT / f'{name}-{width}.mp4', loop, width) for width in (720, 1280)]
        record = {'source': manifest_path(path), 'sourceSha256': sha(path),
                  'sourceWidth': frames[0].shape[1], 'sourceHeight': frames[0].shape[0],
                  'sourceFps': fps, 'sourceFrames': len(frames), 'outputs': output}
        manifest['scenes'][name] = record
        manifest_file.write_text(json.dumps(manifest, indent=2) + '\n')
        sheet = Image.new('RGB', (480*4, 295), '#151619')
        draw = ImageDraw.Draw(sheet)
        for column, index in enumerate((0, len(loop)//3, 2*len(loop)//3, len(loop)-1)):
            image = Image.fromarray(cv2.cvtColor(loop[index], cv2.COLOR_BGR2RGB))
            image.thumbnail((480, 264))
            sheet.paste(image, (column*480, 28))
            draw.text((column*480+8, 8), f'{name} / {index/24:.2f}s', fill='white')
        sheet.save(REPORT / f'{name}-frames.jpg', quality=85)
        print(json.dumps({'scene': name, 'outputs': output}), flush=True)


if __name__ == '__main__':
    main()
