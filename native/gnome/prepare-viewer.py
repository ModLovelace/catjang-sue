#!/usr/bin/env python3
"""Fetch Ubuntu's official GNOME 50 viewer locally; never install a package."""
import hashlib
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
output = root / '.tmp/gnome-prototype/viewer-runtime'
policy = subprocess.check_output(['apt-cache', 'policy', 'mutter-dev-bin'], text=True)
match = re.search(r'Candidate: (\S+)', policy)
if not match or not match[1].startswith('50.'):
    raise SystemExit('A GNOME 50 mutter-dev-bin candidate is required in Ubuntu APT.')
version = match[1]
metadata = subprocess.check_output(['apt-cache', 'show', f'mutter-dev-bin={version}'], text=True)
expected = re.search(r'^SHA256: ([0-9a-f]{64})$', metadata, re.MULTILINE)
if not expected:
    raise SystemExit('APT metadata does not provide a package checksum.')
output.mkdir(parents=True, exist_ok=True)
subprocess.run(['apt', 'download', f'mutter-dev-bin={version}'], cwd=output, check=True)
architecture = subprocess.check_output(['dpkg', '--print-architecture'], text=True).strip()
archive = output / f'mutter-dev-bin_{version}_{architecture}.deb'
if hashlib.sha256(archive.read_bytes()).hexdigest() != expected[1]:
    raise SystemExit('Package checksum differs from Ubuntu APT metadata.')
subprocess.run(['dpkg-deb', '--extract', str(archive), str(output / 'extracted')], check=True)
print(f'Local viewer: {output / "extracted/usr/libexec/mutter-devkit"}')
print('Start with native/gnome/run-nested.sh --manual. No package was installed.')
