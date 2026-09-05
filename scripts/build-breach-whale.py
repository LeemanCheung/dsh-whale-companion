"""Compose an ImageGen-drawn breach with a fixed ImageGen waterline.

The 24 drawings supply body articulation. Rigid camera motion is interpolated
separately; three ink-distance inbetweens join each pair of normalized drawings.
This script draws no whale geometry and never uses SVG.
"""
from pathlib import Path
import argparse
import hashlib
import json
import math
import shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'artwork-sources/breach-v3/poses-imagegen.png'
IDENTITY = ROOT / 'artwork-sources/breach-v3/identity-imagegen.png'
APEX = ROOT / 'artwork-sources/breach-v3/apex-imagegen.png'
OUT = ROOT / '.artifacts/breach-v3'
W = H = 320
ANCHOR = np.array([238.0, 150.0])
cv2.setNumThreads(1)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def locate_drawings(rgb, expected=24):
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    count, labels, stats, centroids = cv2.connectedComponentsWithStats((gray < 100).astype('uint8'), 8)
    components = [(stats[n], centroids[n]) for n in range(1, count) if stats[n, cv2.CC_STAT_AREA] > 1800]
    if len(components) != expected:
        raise ValueError(f'Expected {expected} whole drawings, got {len(components)}')
    if expected == 2: return sorted(components, key=lambda part:part[1][0])
    components.sort(key=lambda part: part[1][1])
    return [part for row in range(4) for part in sorted(components[row*6:row*6+6], key=lambda part: part[1][0])]

def normalize(rgb, component):
    stats, _ = component
    x, y, w, h, _ = stats
    box = (max(0,x-8), max(0,y-8), min(rgb.shape[1],x+w+8), min(rgb.shape[0],y+h+8))
    crop = rgb[box[1]:box[3], box[0]:box[2]]
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    ink = gray < 100
    yy, xx = np.where(ink)
    center = np.array([xx.mean(), yy.mean()])
    values, vectors = np.linalg.eigh(np.cov(np.stack([xx, yy])))
    direction = vectors[:, np.argmax(values)]
    if direction[0] < 0: direction = -direction
    angle = math.degrees(math.atan2(direction[1], direction[0]))
    # White holes are located, not invented. The large white belly is excluded.
    n, labels, info, centers = cv2.connectedComponentsWithStats((gray > 120).astype('uint8'), 8)
    eye_options = []
    for k in range(1, n):
        ex,ey,ew,eh,area = info[k]
        if 1 <= area <= max(55, crop.shape[0]*crop.shape[1]*.005) and ex > crop.shape[1]*.55 and ex>0 and ey>0 and ex+ew<crop.shape[1] and ey+eh<crop.shape[0]:
            eye_options.append((area, centers[k]))
    if not eye_options:
        Image.fromarray(crop).save(OUT/'review-missing-eye.png')
        raise ValueError(f'No source eye in {box}')
    eye = max(eye_options, key=lambda item:item[0])[1]
    # Keep an ink cutout: paper, eye and belly are genuine negative space.
    alpha = np.clip((245.0-gray.astype('float32'))*255/245,0,255)
    radians = math.radians(-angle)
    rot = np.array([[math.cos(radians),-math.sin(radians)],[math.sin(radians),math.cos(radians)]])
    projection = np.stack([xx,yy],axis=1) @ direction
    scale = 196.0/(projection.max()-projection.min())
    matrix = np.column_stack([rot*scale, ANCHOR-rot@eye*scale]).astype('float32')
    norm = cv2.warpAffine(alpha,matrix,(W,H),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
    return np.clip(norm,0,255), {'sourceBox':list(map(int,box)), 'eye':eye.round(6).tolist(), 'sourceAngle':round(angle,5), 'scale':round(float(scale),6)}

def sdf(alpha):
    mask=(alpha>127).astype('uint8')
    return cv2.distanceTransform(mask,cv2.DIST_L2,5)-cv2.distanceTransform(1-mask,cv2.DIST_L2,5)

def periodic_key(t, values):
    phase=t*(len(values)-1)
    k=min(int(phase),len(values)-2)
    f=phase-k
    f=f*f*(3-2*f)
    return values[k]*(1-f)+values[k+1]*f

def rgba(alpha):
    output=np.zeros((H,W,4),dtype='uint8');output[:,:,3]=np.clip(alpha,0,255).round().astype('uint8')
    return Image.fromarray(output)

def build():
    OUT.mkdir(parents=True,exist_ok=True)
    rgb=np.asarray(Image.open(SOURCE).convert('RGB'))
    items=locate_drawings(rgb)
    normalized=[];records=[]
    for part in items:
        image,record=normalize(rgb,part);normalized.append(image);records.append(record)
    apex_rgb=np.asarray(Image.open(APEX).convert('RGB'))
    for index,part in enumerate(locate_drawings(apex_rgb,2)):
        image,record=normalize(apex_rgb,part)
        record['source']='apex-imagegen.png'
        normalized[9+index]=image;records[9+index]=record
    # This layer is cropped from the generated identity, not drawn with paths.
    identity=Image.open(IDENTITY).convert('RGB')
    strip=identity.crop((140,797,430,820)).resize((292,26),Image.Resampling.LANCZOS)
    line=np.clip((245-np.asarray(strip).mean(2))*255/245,0,255)
    water=np.zeros((H,W),dtype='float32');water[144:170,14:306]=line
    distance=[sdf(x) for x in normalized]
    frames=[]
    for n in range(96):
        t=n/96
        pose=t*24; k=int(pose); f=pose-k; j=(k+1)%24
        if f == 0: shape=normalized[k]
        else:
            shape=np.clip(127.5+(distance[k]*(1-f)+distance[j]*f)*255,0,255)
        angle=periodic_key(t,[-28,-40,-53,-55,-35,-4,25,55,60,32,2,-10,-28])
        x=periodic_key(t,[222,226,238,250,258,262,262,251,236,225,220,220,222])
        y=periodic_key(t,[207,186,150,112,85,92,115,160,213,243,235,220,207])
        r=math.radians(angle)
        rot=np.array([[math.cos(r),-math.sin(r)],[math.sin(r),math.cos(r)]])
        matrix=np.column_stack([rot,np.array([x,y])-rot@ANCHOR]).astype('float32')
        placed=cv2.warpAffine(shape,matrix,(W,H),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_CONSTANT)
        underwater=np.clip((np.arange(H)-157)/5,0,1)
        placed*=1-underwater[:,None]*.25
        layer=rgba(placed)
        layer.alpha_composite(rgba(water))
        frames.append(layer)
    times=[round((n+1)*2400/96)-round(n*2400/96) for n in range(96)]
    frames[0].save(OUT/'breach.webp',save_all=True,append_images=frames[1:],duration=times,loop=0,lossless=True,method=6,exact=True)
    frames[32].save(OUT/'poster.png')
    thumbs=[]
    for frame in frames:
        bg=Image.new('RGBA',frame.size,'white');bg.alpha_composite(frame);thumbs.append(bg.convert('RGB'))
    thumbs[0].save(OUT/'preview.gif',save_all=True,append_images=thumbs[1:],duration=[20,30]*48,loop=0,disposal=2)
    board=Image.new('RGB',(6*160,4*185),'#f3f6f8');draw=ImageDraw.Draw(board)
    for n in range(24):
        board.paste(thumbs[n*4].resize((160,160),Image.Resampling.LANCZOS),(n%6*160,n//6*185+20))
        draw.text((n%6*160+8,n//6*185+4),str(n+1),fill='#304050')
    board.save(OUT/'contact.png')
    report={'source':sha(SOURCE),'identity':sha(IDENTITY),'apex':sha(APEX),'drawings':24,'frames':96,'fps':40,'durationMs':2400,'canvas':[W,H],'records':records,'runtimeSha256':sha(OUT/'breach.webp')}
    (OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({key:value for key,value in report.items() if key!='records'}))
    return frames, report

def publish():
    frames, report=build()
    assets=ROOT/'packages/dsh-whale-companion/assets'
    for source,target in [('breach.webp','ink-breach-motion.webp'),('poster.png','ink-breach-still.png')]:
        shutil.copyfile(OUT/source,assets/target)
    shutil.copyfile(OUT/'contact.png',ROOT/'docs/ink-breach-contact.png')
    shutil.copyfile(OUT/'preview.gif',ROOT/'docs/ink-breach-preview.gif')
    (assets/'ink-breach-report.json').write_text(json.dumps(report,indent=2)+'\n')

def check():
    frames, report=build()
    assets=ROOT/'packages/dsh-whale-companion/assets'
    recorded=json.loads((assets/'ink-breach-report.json').read_text())
    if sha(assets/'ink-breach-motion.webp') != recorded['runtimeSha256']:
        raise ValueError('Published playback hash differs from its review report')
    report['runtimeSha256']=recorded['runtimeSha256']
    if report != recorded: raise ValueError('Source, crop, placement or timing contract changed')
    decoded=Image.open(assets/'ink-breach-motion.webp')
    if decoded.size != (W,H) or decoded.n_frames != 96: raise ValueError('Playback dimensions/frame count changed')
    total=0; maximum=0; hashes=set()
    for n,expected in enumerate(frames):
        decoded.seek(n);actual=np.asarray(decoded.convert('RGBA'))
        total+=decoded.info.get('duration',0)
        difference=np.abs(actual.astype('int16')-np.asarray(expected).astype('int16'))
        maximum=max(maximum,int(difference.max()))
        if difference.max()>1: raise ValueError(f'Frame {n+1} differs by {difference.max()} levels')
        if actual[:4,:,3].any() or actual[-4:,:,3].any() or actual[:,:4,3].any() or actual[:,-4:,3].any():
            raise ValueError(f'Frame {n+1} clips the canvas border')
        hashes.add(hashlib.sha256(actual.tobytes()).hexdigest())
    if total!=2400 or len(hashes)!=96: raise ValueError('Timing or distinct frame count changed')
    with Image.open(assets/'ink-breach-still.png') as still:
        if still.convert('RGBA').tobytes()!=frames[32].tobytes(): raise ValueError('Static fallback is not the selected generated pose')
    print(json.dumps({'ok':True,'frames':96,'uniqueFrames':len(hashes),'durationMs':total,'maximumChannelError':maximum,'sources':24}))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--publish',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    if args.check: check()
    elif args.publish: publish()
    else: build()
