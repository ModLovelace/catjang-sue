#!/usr/bin/env python3
"""Freeze the canonical idle SVG and derive its native input map from PNG alpha."""
import argparse
import hashlib
import json
import math
import re
import shutil
import zipfile
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import gi
gi.require_version('GdkPixbuf', '2.0')
from gi.repository import GdkPixbuf, GLib

ROOT = Path(__file__).resolve().parents[2]
UUID = 'catjang-prototype@modlovelace.github.io'
SIZE = 200
ALPHA_THRESHOLD = 16
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
RENDERER = (ROOT / 'renderer/renderer.js').read_text()


def freeze_svg(destination, pose='idle', phase=0, blink=False, look=(0, 0), petting=False, heat=0, stretch_progress=0, dimensions=(SIZE, SIZE), chain=False, extension=0):
    source = ROOT / f'svg/cat/{pose}.svg'
    tree = ET.parse(source)
    svg = tree.getroot()
    renderer = RENDERER
    paths = {
        'ear-left': 'EAR_LEFT_PATH_D',
        'ear-right': 'EAR_RIGHT_PATH_D',
        'tail': 'TAIL_PATH_D',
    }
    for element in svg.iter():
        component = element.get('id')
        if component not in paths:
            continue
        match = re.search(rf'const {paths[component]} = "([^"]+)";', renderer)
        if not match:
            raise ValueError(f'Canonical path missing: {component}')
        origin = element.get('data-ear-position') or element.get('data-patch-frame')
        x, y = origin.split()[:2]
        ET.SubElement(element, f'{{{NS}}}path', {
            'd': match[1], 'transform': f'translate({x} {y})', 'fill': '#1A1A1A',
        })
    for parent in svg.iter():
        for element in list(parent):
            if element.tag == f'{{{NS}}}style' or (element.get('class') == 'closed-eye-line' and not petting):
                parent.remove(element)
    values = {'--cat-color': '#1A1A1A', '--cat-outline': '#FFFFFF'}
    expression = re.compile(r'var\((--[\w-]+)(?:,\s*([^()]+))?\)')
    for element in svg.iter():
        for name, value in list(element.attrib.items()):
            while 'var(' in value:
                replaced = expression.sub(lambda m: values.get(m[1], (m[2] or '#1A1A1A').strip()), value)
                if replaced == value:
                    raise ValueError(f'Unresolved SVG variable: {value}')
                value = replaced
            element.set(name, value)
    color = '#%02x%02x%02x' % tuple(round(base + (hot - base) * .7 * heat) for base, hot in zip((26, 26, 26), (220, 40, 40)))
    for element in svg.iter():
        classes = element.get('class', '').split()
        if element.get('fill') == '#1A1A1A' and not any(c.startswith('pupil-') for c in classes):
            element.set('fill', color)
    if pose == 'stretch':
        t = stretch_progress
        amount = .5 - .5 * math.cos(math.pi * t / .3) if t < .3 else (1 if t <= .7 else .5 + .5 * math.cos(math.pi * (t - .7) / .3))
        transforms = {
            'leg-fl': f'translate({4*amount} {8.7*amount}) translate(11.5 22) rotate({51*amount}) scale(1 {1-.31*amount}) translate(-11.5 -22)',
            'leg-fr': f'translate({2*amount} {9.7*amount}) translate(20.5 22) rotate({51*amount}) scale(1 {1-.31*amount}) translate(-20.5 -22)',
            'leg-rl': f'translate({7*amount} {-2*amount})', 'leg-rr': f'translate({7*amount} {-2*amount})',
            'body': f'translate({5*amount} {amount})', 'head-group': f'translate({5*amount} {4*amount})',
            'tail': f'translate(39 21) rotate({-10*amount}) translate(-39 -21) translate({amount} {-2*amount})',
        }
        for element in svg.iter():
            component = element.get('id')
            if component in transforms: element.set('transform', transforms[component])
            if component in ['eyes-open', 'eyes-closed']:
                element.set('opacity', str(int((amount < .85) if component == 'eyes-open' else (amount >= .85))))
            if element.get('fill') == '#1A1A1A' and component not in ['pupil-left', 'pupil-right']:
                classes = element.get('class', '')
                if 'pupil' not in classes: element.set('fill', '#347a45' if amount > .1 else '#1A1A1A')
    # Native textures cannot run SVG CSS animations. Freeze canonical component
    # transforms into a small frame set and derive input from each painted frame.
    for element in svg.iter():
        classes = element.get('class', '').split()
        if 'pupil-left' in classes or 'pupil-right' in classes:
            transform = element.get('transform', '')
            element.set('transform', f'{transform} translate({look[0]} {look[1]})'.strip())
        if petting and ('eye-l-blink' in classes or 'eye-r-blink' in classes):
            element.set('opacity', '0')
    wave = math.sin(phase)
    for element in svg.iter():
        classes = element.get('class', '').split()
        if pose == 'idle':
            if 'breathe-anim' in classes:
                element.set('transform', f'translate(16 22) scale({1 + .015 * wave} {1 - .015 * wave}) translate(-16 -22)')
            if 'tail-sway' in classes:
                element.set('transform', f'rotate({5 * wave} 24 31)')
            if blink and ('eye-l-blink' in classes or 'eye-r-blink' in classes):
                element.set('transform', 'translate(0 12.5) scale(1 .12) translate(0 -12.5)')
        if pose == 'scroll' and ('speed-a' in classes or 'speed-b' in classes):
            element.set('transform', f'translate(0 {3 * wave})')
        if pose == 'drag' and element.get('id', '').startswith('leg-'):
            origin = element.get('data-patch-frame', '0 0').split()
            element.set('transform', f'rotate({7 * wave} {origin[0]} {origin[1]})')
    if pose == 'drag' and chain:
        start = ET.parse(ROOT / 'svg/stretch-start.svg').getroot()
        start_rects = list(start.iter(f'{{{NS}}}rect'))
        # Electron excludes defs/clip paths/patches; here only painted rects
        # in cat-content remain in the same canonical order as stretch-start.
        content = next(el for el in svg.iter() if el.get('id') == 'cat-content')
        end_rects = [el for el in content.iter(f'{{{NS}}}rect') if el.get('fill') is not None]
        def position(el, axis):
            if el.get(axis) is not None: return float(el.get(axis))
            match = re.search(r'translate\(([-\d.]+)[ ,]+([-\d.]+)\)', el.get('transform', ''))
            return float(match[1 if axis == 'x' else 2]) if match else 0
        for index, element in enumerate(end_rects):
            y = position(element, 'y'); h = float(element.get('height', 0))
            if y + h < 25: continue
            original = start_rects[index]
            for axis in ['x', 'y', 'width', 'height']:
                end_value = position(element, axis) if axis in ['x','y'] else float(element.get(axis))
                start_value = position(original, axis) if axis in ['x','y'] else float(original.get(axis))
                element.set(axis, str(start_value + (end_value - start_value) * extension))
            element.attrib.pop('transform', None)
        for element in svg.iter():
            component = element.get('id','')
            if component.startswith('leg-'):
                delta = float(element.get('data-stretch-y-delta', 0)) * (1-extension)
                element.set('transform', f'translate(0 {delta})')
            if component == 'tail': element.set('transform', f'translate(0 {-83*(1-extension)})')
        svg.set('viewBox', '-20 -2 80 148')
    elif pose == 'drag':
        # The canonical hanging body is designed for an elastic 145-unit chain.
        # This first native drag uses a compact suspended pose with the head's
        # proportions intact, rather than shrinking the whole cat to fit 200px.
        def compact_y(y):
            return y if y <= 25 else 25 + (y - 25) * .12
        content = next(element for element in svg.iter() if element.get('id') == 'cat-content')
        for element in list(content):
            if element.tag == f'{{{NS}}}rect' and element.get('y') is not None:
                y = float(element.get('y'))
                h = float(element.get('height'))
                element.set('y', str(compact_y(y)))
                element.set('height', str(max(1, compact_y(y + h) - compact_y(y))))
            component = element.get('id', '')
            if component == 'tail' or component.startswith('leg-'):
                origin_y = float(element.get('data-patch-frame').split()[1])
                delta = compact_y(origin_y) - origin_y
                element.set('transform', f'translate(0 {delta}) {element.get("transform", "")}')
        svg.set('viewBox', '0 0 40 55')
    svg.set('width', str(dimensions[0]))
    svg.set('height', str(dimensions[1]))
    tree.write(destination, encoding='utf-8', xml_declaration=True)
    return source


def regions_from_alpha(pixbuf):
    pixels = pixbuf.get_pixels()
    assert pixbuf.get_has_alpha() and pixbuf.get_n_channels() == 4
    active, rects = {}, []
    for y in range(pixbuf.get_height()):
        runs, x = [], 0
        while x < pixbuf.get_width():
            if pixels[y * pixbuf.get_rowstride() + x * 4 + 3] < ALPHA_THRESHOLD:
                x += 1
                continue
            start = x
            while x < pixbuf.get_width() and pixels[y * pixbuf.get_rowstride() + x * 4 + 3] >= ALPHA_THRESHOLD:
                x += 1
            runs.append((start, x - start))
        next_active = {}
        for key in runs:
            rect = active.pop(key, {'x': key[0], 'y': y, 'width': key[1], 'height': 0})
            rect['height'] += 1
            next_active[key] = rect
        rects.extend(active.values())
        active = next_active
    rects.extend(active.values())
    if not rects:
        raise ValueError('Rendered pet is empty')
    return rects


def heat_mask(cold, hot):
    original, colored = cold.get_pixels(), hot.get_pixels()
    rgba = bytearray(len(original))
    for index in range(0,len(rgba),4):
        # Only anatomical pixels whose canonical fill changed. White outline,
        # eye/pupil and keyboard materials remain absent from this mask.
        changed = original[index:index+3] != colored[index:index+3]
        if changed:
            rgba[index:index+4] = bytes((220,40,40,original[index+3]))
    return GdkPixbuf.Pixbuf.new_from_bytes(GLib.Bytes.new(bytes(rgba)), GdkPixbuf.Colorspace.RGB, True, 8,
        cold.get_width(), cold.get_height(), cold.get_rowstride())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', nargs='?')
    parser.add_argument('--application', action='store_true')
    options = parser.parse_args()
    uuid = 'catjang-native@modlovelace.github.io' if options.application else UUID
    output = Path(options.output).resolve() if options.output else ROOT / '.tmp/gnome-prototype'
    stage = output / uuid
    assets = stage / 'assets'
    assets.mkdir(parents=True, exist_ok=True)
    for name in ['extension.js', 'animation.js', 'metadata.json']:
        shutil.copyfile(ROOT / 'native/gnome/extension' / name, stage / name)
    if options.application:
        metadata = json.loads((stage / 'metadata.json').read_text())
        metadata.update(uuid=uuid, name='Catjang — GNOME', description='Native Catjang backend controlled by the Linux application. Experimental GNOME 50 integration.')
        (stage / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    inputs = [Path(__file__), ROOT / 'renderer/renderer.js', ROOT / 'svg/stretch-start.svg', *sorted((ROOT / 'svg/cat').glob('*.svg'))]
    digest = hashlib.sha256(b''.join(path.read_bytes() for path in inputs)).hexdigest()
    stamp = assets / '.input-fingerprint'
    cached = stamp.exists() and stamp.read_text() == digest and (assets / 'input-regions.json').exists()
    if cached:
        geometry = json.loads((assets / 'input-regions.json').read_text())
        frames = geometry['frames']
    else:
        shutil.rmtree(assets)
        assets.mkdir(parents=True)
        specs = [('idle', 'idle', 0, False)]
        specs += [(f'idle-{i}', 'idle', i * math.pi / 4, False) for i in range(1, 8)]
        specs.append(('blink', 'idle', 0, True))
        specs += [(pose, pose, 0, False) for pose in
                  ['press-left', 'press-right', 'scroll', 'drag', 'stretch', 'jump-start', 'jump-ing']]
        specs += [('scroll-alt', 'scroll', math.pi / 2, False),
                  ('drag-alt', 'drag', math.pi / 2, False)]
        specs += [('purr', 'idle', 0, False), ('purr-alt', 'idle', math.pi / 2, False)]
        frames = {}
        for name, pose, phase, blink in specs:
            source = freeze_svg(assets / f'{name}.svg', pose, phase, blink, petting=name.startswith('purr'))
            pixbuf = GdkPixbuf.Pixbuf.new_from_file(str(assets / f'{name}.svg'))
            pixbuf.savev(str(assets / f'{name}.png'), 'png', [], [])
            frames[name] = {
                'file': f'{name}.png',
                'width': pixbuf.get_width(), 'height': pixbuf.get_height(),
                'source': str(source.relative_to(ROOT)),
                'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                'rects': regions_from_alpha(pixbuf),
            }
            if not blink and not name.startswith('purr') and 'pupil-' in source.read_text():
                looks = {}
                for dx in [-1, 0, 1]:
                    for dy in [-1, 0, 1]:
                        if dx == dy == 0:
                            continue
                        stem = f'{name}-look-{dx}-{dy}'
                        freeze_svg(assets / f'{stem}.svg', pose, phase, blink, look=(dx, dy))
                        looked = GdkPixbuf.Pixbuf.new_from_file(str(assets / f'{stem}.svg'))
                        if regions_from_alpha(looked) != frames[name]['rects']:
                            raise ValueError(f'Eye tracking changed the input silhouette: {stem}')
                        looked.savev(str(assets / f'{stem}.png'), 'png', [], [])
                        looks[f'{dx},{dy}'] = f'{stem}.png'
                frames[name]['looks'] = looks
            if pose != 'stretch':
                mask_paths = {}
                for key in ['0,0', *frames[name].get('looks', {})]:
                    dx, dy = map(int, key.split(','))
                    stem = f'{name}-mask-{dx}-{dy}'
                    cold_file = frames[name].get('looks', {}).get(key, frames[name]['file'])
                    freeze_svg(assets / f'{stem}.svg', pose, phase, blink, look=(dx,dy), petting=name.startswith('purr'), heat=1)
                    hot = GdkPixbuf.Pixbuf.new_from_file(str(assets / f'{stem}.svg'))
                    cold = GdkPixbuf.Pixbuf.new_from_file(str(assets / cold_file))
                    heat_mask(cold, hot).savev(str(assets / f'{stem}.png'), 'png', [], [])
                    mask_paths[key] = f'{stem}.png'
                frames[name]['heatMasks'] = mask_paths
        stretch = []
        for index in range(21):
            stem = f'stretch-full-{index}'
            freeze_svg(assets / f'{stem}.svg', 'stretch', stretch_progress=index/20, dimensions=(720,560))
            pixbuf = GdkPixbuf.Pixbuf.new_from_file(str(assets / f'{stem}.svg'))
            pixbuf.savev(str(assets / f'{stem}.png'), 'png', [], [])
            stretch.append(f'{stem}.png')
        chain_frames = []
        for index in range(21):
            stem = f'drag-chain-{index}'
            freeze_svg(assets / f'{stem}.svg', 'drag', chain=True, extension=index/20, dimensions=(320,592))
            cold = GdkPixbuf.Pixbuf.new_from_file(str(assets / f'{stem}.svg'))
            freeze_svg(assets / f'{stem}-hot.svg', 'drag', chain=True, extension=index/20, dimensions=(320,592), heat=1)
            hot = GdkPixbuf.Pixbuf.new_from_file(str(assets / f'{stem}-hot.svg'))
            mask = heat_mask(cold, hot)
            pieces = []
            cuts = [0, 96] + [96 + round((592-96)*i/16) for i in range(1,17)]
            for part, (top, bottom) in enumerate(zip(cuts, cuts[1:])):
                filename = f'{stem}-part-{part}.png'
                maskname = f'{stem}-part-{part}-heat.png'
                height = min(592-top, bottom-top+2) # seam overlap, no new outline filters
                cold.new_subpixbuf(0,top,320,height).savev(str(assets / filename),'png',[],[])
                mask.new_subpixbuf(0,top,320,height).savev(str(assets / maskname),'png',[],[])
                pieces.append({'file':filename,'mask':maskname,'top':top,'width':320,'height':height})
            chain_frames.append(pieces)
        geometry = {**frames['idle'], 'alphaThreshold': ALPHA_THRESHOLD, 'frames': frames, 'stretch': stretch, 'dragChain': chain_frames}
        (assets / 'input-regions.json').write_text(json.dumps(geometry, indent=2) + '\n')
        stamp.write_text(digest)
    # A standard extension ZIP also builds on CI without running GNOME Shell.
    bundle = output / f'{uuid}.shell-extension.zip'
    with zipfile.ZipFile(bundle, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(stage.rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(stage))
    print(f'Built {output / (uuid + ".shell-extension.zip")} ({len(frames)} frames, {len(geometry["rects"])} idle input regions)')


if __name__ == '__main__':
    main()
