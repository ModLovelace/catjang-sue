"""Native textures for the five self-contained canonical mascot SVG families.

Catjang's dynamic body/ears and accordion stay in build.py. These families use
complete hanging poses and Electron's whole-body pendulum, not the cat's bands.
"""
import hashlib
import json
import math
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from gi.repository import GdkPixbuf

NS = 'http://www.w3.org/2000/svg'


def freeze(root, mascot, pose, output, phase=0, look=(0, 0), blink=False, petting=False, heat=False, hunting_time=None, hunting_return=False):
    source = root / 'svg' / mascot / f'{pose}.svg'
    tree = ET.parse(source, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))
    svg = tree.getroot()
    variables = dict(re.findall(r'(--[\w-]+):\s*([^;]+);', source.read_text()))
    expression = re.compile(r'var\((--[\w-]+)(?:,\s*([^()]+))?\)')
    for parent in svg.iter():
        for element in list(parent):
            if element.tag == f'{{{NS}}}style': parent.remove(element)
    wave = math.sin(phase)
    for element in svg.iter():
        for key, value in list(element.attrib.items()):
            while 'var(' in value:
                replaced = expression.sub(lambda m: variables.get(m[1], (m[2] or '#1A1A1A').strip()), value)
                if replaced == value: raise ValueError(f'Unresolved {mascot}/{pose}: {value}')
                value = replaced
            element.set(key, value)
        classes = element.get('class', '').split()
        component = element.get('id', '')
        if component == 'dog-tongue': element.set('display', 'inline' if petting else 'none')
        if 'pupil-left' in classes or 'pupil-right' in classes:
            element.set('transform', f'translate({look[0]} {look[1]})')
        if 'eye-l-blink' in classes or 'eye-r-blink' in classes:
            if blink or petting:
                ys = [float(e.get('y')) for e in element.iter() if e.get('y') is not None]
                heights = [float(e.get('y',0))+float(e.get('height',0)) for e in element.iter() if e.get('y') is not None]
                cy = (min(ys)+max(heights))/2 if ys else 12
                element.set('transform', f'translate(0 {cy}) scale(1 {0.18 if petting else .1}) translate(0 {-cy})')
        if 'breathe-anim' in classes:
            element.set('transform', f'translate(16 22) scale(1 {1-.02*wave}) translate(-16 -22)')
        if 'tail-wag' in classes or 'tail-sway' in classes:
            angle = (16 if petting else 10)*wave
            element.set('transform', f'rotate({angle} 24 28)')
        if petting and component == 'face-js': element.set('transform', f'translate(0 {.4*wave})')
        if petting and 'ear-twitch-l' in classes: element.set('transform', 'rotate(-8 7 6)')
        if petting and 'ear-twitch-r' in classes: element.set('transform', 'rotate(8 21 6)')
        if 'speed-a' in classes or 'speed-b' in classes: element.set('transform', f'translate(0 {3*wave})')
        if any(c.startswith('dangle-') for c in classes):
            origin = (34,44) if 'dangle-tail' in classes else (23,30)
            element.set('transform', f'rotate({7*wave} {origin[0]} {origin[1]})')
        if 'stretch-tail' in classes: element.set('transform', f'rotate({10*wave} 48 23)')
        if 'stretch-body-anim' in classes: element.set('transform', f'translate(0 {wave})')
    if hunting_time is not None:
        progress = min(1, max(0, hunting_time / .42))
        amount = 1 - (1-progress)**3
        if hunting_return: amount = 1-amount
        wag = math.sin(hunting_time * math.tau / .34) if not hunting_return else 0
        for element in svg.iter():
            classes = element.get('class', '').split()
            if element.get('id') == 'face-js':
                element.set('transform', f'translate({.8*wag*amount} {3*amount}) rotate({-3*wag*amount} 16 18)')
            if 'breathe-anim' in classes:
                element.set('transform', f'translate(16 34) scale({1+.08*amount} {1-.12*amount}) translate(-16 -34)')
            if 'tail-wag' in classes or 'tail-sway' in classes:
                element.set('transform', f'rotate({(28*wag-12)*amount} 24 28)')
            if 'ear-twitch-l' in classes: element.set('transform', f'rotate({-12*amount} 7 6)')
            if 'ear-twitch-r' in classes: element.set('transform', f'rotate({12*amount} 21 6)')
            if 'pupil-left' in classes or 'pupil-right' in classes:
                x,y=float(element.get('x',0)),float(element.get('y',0))
                cx,cy=x+float(element.get('width',1))/2,y+float(element.get('height',1))/2
                f=1+.22*amount
                element.set('transform',f'{element.get("transform", "")} translate({cx} {cy}) scale({f}) translate({-cx} {-cy})')
    if heat:
        # Keep eyes and keyboards out of anatomical heat. Canonical comments
        # delimit the ungrouped keyboard primitives in these standalone poses.
        def tint(parent, excluded=False):
            section = excluded
            for element in parent:
                if element.tag is ET.Comment:
                    comment = (element.text or '').lower()
                    if 'keyboard' in comment: section = True
                    elif any(word in comment for word in ['paw','body','head','leg','tail','nose','tongue','muzzle','ear','wrinkle','ruff','collar']): section = excluded
                    elif 'eye' in comment and 'eyebrow' not in comment: section = True
                    continue
                component = element.get('id','')
                classes = element.get('class','')
                skip = section or component.startswith(('eye-','pupil-')) or 'eye-l-blink' in classes or 'eye-r-blink' in classes
                fill = element.get('fill','')
                if not skip and re.fullmatch(r'#[0-9a-fA-F]{6}',fill):
                    channels=[int(fill[i:i+2],16) for i in [1,3,5]]
                    element.set('fill','#'+''.join(f'{round(c+(target-c)*.7):02x}' for c,target in zip(channels,[220,40,40])))
                tint(element,skip)
        for element in svg.iter():
            if element.get('id') in ['dog-content','cat-content']: tint(element)
    svg.set('width','720' if pose=='stretch' else '200')
    svg.set('height','560' if pose=='stretch' else '200')
    tree.write(output,encoding='utf-8',xml_declaration=True)
    return source


def build_all(root, assets, regions_from_alpha, heat_mask):
    catalog=json.loads((root/'native/gnome/catalog.json').read_text())
    for mascot, info in catalog.items():
        if mascot=='cat': continue
        folder=assets/mascot
        inputs=[Path(__file__),root/'native/gnome/catalog.json',*sorted((root/'svg'/mascot).glob('*.svg'))]
        digest=hashlib.sha256(b''.join(p.read_bytes() for p in inputs)).hexdigest()
        stamp=folder/'.input-fingerprint'
        if stamp.exists() and stamp.read_text()==digest and (folder/'input-regions.json').exists(): continue
        if folder.exists(): shutil.rmtree(folder)
        folder.mkdir(parents=True)
        specs=[('idle','idle',0,False)]
        specs += [(f'idle-{i}','idle',i*math.pi/4,False) for i in range(1,8)]
        specs += [('blink','idle',0,True)]
        specs += [(pose,pose,0,False) for pose in ['press-left','press-right','scroll','drag','jump-start','jump-ing']]
        specs += [('scroll-alt','scroll',math.pi/2,False),('drag-alt','drag',math.pi/2,False),('purr','idle',0,False),('purr-alt','idle',math.pi/2,False)]
        specs += [(f'hunt-{i}','idle',0,False) for i in range(28)]
        specs += [(f'hunt-return-{i}','idle',0,False) for i in range(12)]
        frames={}
        for name,pose,phase,blink in specs:
            hunting_time = int(name.rsplit('-',1)[1])*.04 if name.startswith('hunt-') else None
            hunt_args = {'hunting_time':hunting_time,'hunting_return':name.startswith('hunt-return-')}
            looked_files={}; masks={}; first=None
            for dx,dy in [(0,0),*[(x,y) for x in [-1,0,1] for y in [-1,0,1] if (x,y)!=(0,0)]]:
                key=f'{dx},{dy}';stem=name if key=='0,0' else f'{name}-look-{dx}-{dy}'
                svg=folder/f'{stem}.svg'
                source=freeze(root,mascot,pose,svg,phase,look=(dx,dy),blink=blink,petting=name.startswith('purr'),**hunt_args)
                cold=GdkPixbuf.Pixbuf.new_from_file(str(svg));cold.savev(str(folder/f'{stem}.png'),'png',[],[])
                if first is None:
                    first=cold
                    frames[name]={'file':f'{mascot}/{stem}.png','width':200,'height':200,'source':str(source.relative_to(root)),
                        'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'rects':regions_from_alpha(cold)}
                else:
                    if not name.startswith('hunt-') and regions_from_alpha(cold)!=frames[name]['rects']: raise ValueError(f'Look changes silhouette: {mascot}/{stem}')
                    looked_files[key]=f'{mascot}/{stem}.png'
                hot_svg=folder/f'{stem}-hot.svg'
                freeze(root,mascot,pose,hot_svg,phase,look=(dx,dy),blink=blink,petting=name.startswith('purr'),heat=True,**hunt_args)
                hot=GdkPixbuf.Pixbuf.new_from_file(str(hot_svg))
                mask=f'{stem}-mask.png';heat_mask(cold,hot).savev(str(folder/mask),'png',[],[])
                masks[key]=f'{mascot}/{mask}'
                svg.unlink();hot_svg.unlink()
            frames[name]['looks']=looked_files;frames[name]['heatMasks']=masks
        stretch=[]
        for index in range(21):
            stem=f'stretch-full-{index}';svg=folder/f'{stem}.svg'
            freeze(root,mascot,'stretch',svg,phase=index*math.pi/5)
            GdkPixbuf.Pixbuf.new_from_file(str(svg)).savev(str(folder/f'{stem}.png'),'png',[],[])
            stretch.append(f'{mascot}/{stem}.png');svg.unlink()
        geometry={'width':200,'height':200,'frames':frames,'stretch':stretch,'dragChain':[]}
        (folder/'input-regions.json').write_text(json.dumps(geometry,indent=2)+'\n');stamp.write_text(digest)
    (assets/'catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
