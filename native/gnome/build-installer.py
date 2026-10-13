#!/usr/bin/env python3
"""Build a checksum-verified user installer from electron-builder's Linux dir."""
import argparse
import hashlib
import json
import shutil
import tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('distribution',type=Path);p.add_argument('output',type=Path);options=p.parse_args()
distribution=options.distribution.resolve();output=options.output.resolve();output.mkdir(parents=True,exist_ok=True)
assert (distribution/'catjang-bin').is_file(), 'Missing packaged Linux executable'
assert (distribution/'resources/gnome/catalog.json').is_file(), 'Missing native mascot catalog'
# Launcher and icon are already Linux-only extraResources; copy executable beside Electron.
shutil.copyfile(ROOT/'native/gnome/installed-launcher.sh',distribution/'catjang-gnome');(distribution/'catjang-gnome').chmod(0o755)
shutil.copyfile(ROOT/'native/gnome/installed-launcher.sh',distribution/'resources/gnome/installed-launcher.sh')
shutil.copyfile(ROOT/'License.md',distribution/'License.md')
payload=output/'catjang-linux-payload.tar.gz'
with tarfile.open(payload,'w:gz') as archive:
    for file in sorted(distribution.iterdir()): archive.add(file,arcname=file.name)
digest=hashlib.sha256(payload.read_bytes()).hexdigest()
version=json.loads((ROOT/'package.json').read_text())['version']
release=f'{version}-gnome4-{digest[:12]}'
header=(ROOT/'native/gnome/manual-installer.sh').read_bytes().replace(b'@PAYLOAD_SHA256@',digest.encode()).replace(b'@RELEASE@',release.encode())
installer=output/f'Catjang-{version}-GNOME4-linux-x64.run'
with installer.open('wb') as result:
    result.write(header);result.write(payload.read_bytes())
installer.chmod(0o755)
checksum=hashlib.sha256(installer.read_bytes()).hexdigest()
(output/(installer.name+'.sha256')).write_text(f'{checksum}  {installer.name}\n')
print(installer);print(f'SHA256 {checksum}')
