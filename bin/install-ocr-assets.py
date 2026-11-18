"""Download pinned official npm distributions; verify registry SRI; select static browser assets only."""
from pathlib import Path
import urllib.request,json,base64,hashlib,tarfile,io,gzip,shutil
import tempfile
base=Path(tempfile.mkdtemp(prefix='portefeuille-ocr-'))
asset=Path(__file__).resolve().parents[1]/'public/assets/vendor-ocr-v1';asset.mkdir(parents=True,exist_ok=True)
packages=[('tesseract.js','6.0.1'),('tesseract.js-core','6.1.2'),('pdfjs-dist','6.5.438'),('@tesseract.js-data/fra','1.0.0'),('@tesseract.js-data/eng','1.0.0')]
records=[]
for name,version in packages:
 url='https://registry.npmjs.org/'+name+'/'+version
 with urllib.request.urlopen(url,timeout=40) as r:meta=json.load(r)
 dist=meta['dist'];assert dist['tarball'].startswith('https://registry.npmjs.org/')
 cached=base/(name.replace('/','_').replace('@','')+'-'+version+'.tgz')
 if not cached.exists():
  with urllib.request.urlopen(dist['tarball'],timeout=90) as r:cached.write_bytes(r.read())
 raw=cached.read_bytes();algorithm,digest=dist['integrity'].split('-',1);assert algorithm=='sha512' and base64.b64encode(hashlib.sha512(raw).digest()).decode()==digest,name
 archive=tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz')
 for m in archive.getmembers():
  if not m.isfile() or not m.name.startswith('package/'):continue
  relative=m.name.removeprefix('package/');target=None;unzip=False
  if name=='tesseract.js':
   if relative in ['dist/tesseract.esm.min.js','dist/worker.min.js','dist/tesseract.min.js','dist/tesseract.min.js.LICENSE.txt','dist/worker.min.js.LICENSE.txt','LICENSE.md','LICENSE'] :target='tesseract/'+relative.removeprefix('dist/')
  elif name=='tesseract.js-core':
   if '/' not in relative and (relative.startswith('tesseract-core') or relative in ['LICENSE','README.md']):target='core/'+relative
  elif name=='pdfjs-dist':
   if relative in ['legacy/build/pdf.min.mjs','legacy/build/pdf.worker.min.mjs']:target='pdf/'+relative.split('/')[-1].replace('.min.mjs','.mjs')
   elif relative.startswith(('cmaps/','standard_fonts/','wasm/','iccs/')) or relative in ['LICENSE','README.md']:target='pdf/'+relative
  else:
   lang=name.split('/')[-1]
   if relative=='4.0.0/'+lang+'.traineddata.gz':target='lang/'+lang+'.traineddata';unzip=True
   elif relative.lower().startswith(('license','readme')):target='lang/'+lang+'-'+relative
  if target:
   p=asset/target;assert '..' not in p.parts;p.parent.mkdir(parents=True,exist_ok=True);data=archive.extractfile(m).read();p.write_bytes(gzip.decompress(data) if unzip else data)
 records.append({'name':name,'version':version,'registry':url,'integrity':dist['integrity']})
manifest={'packages':records,'files':{str(p.relative_to(asset)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(asset.rglob('*')) if p.is_file() and p.name!='manifest.json'}}
(asset/'manifest.json').write_text(json.dumps(manifest,indent=2))
print(json.dumps({'packages':[(x['name'],x['version'])for x in records],'files':len(manifest['files']),'bytes':sum(p.stat().st_size for p in asset.rglob('*') if p.is_file())}))
