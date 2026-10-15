"use strict";
// Canonical voice profiles consumed by Electron's renderer and the GNOME bridge.
// Filenames are relative to this directory; no platform owns a second mapping.
(function(root){
  const profiles={
    cat: {voice:'catjang-meow.m4a',petting:'purring.m4a',pettingVolume:.28},
    schnauzer: {voice:'toto-bark.m4a',petting:'toto-petting.m4a',pettingVolume:.20},
    chisi: {voice:'chisi-bark.m4a',petting:'chisi-petting.m4a',pettingVolume:.18},
    milo: {voice:'milo-bark.m4a',petting:'milo-petting.m4a',pettingVolume:.18},
    musubi: {voice:'musubi-meow.m4a',petting:'musubi-purring.m4a',pettingVolume:.28},
    peruperro: {voice:'dog-bark.m4a',petting:'chuno-petting.m4a',pettingVolume:.18},
  };
  for(const p of Object.values(profiles))Object.freeze(p);
  const catalog=Object.freeze(profiles);
  if(typeof module!=='undefined'&&module.exports)module.exports=catalog;
  else root.CatjangAudio=catalog;
})(globalThis);
