"use strict";
const path=require('node:path');
// The existing parsers stay shared. Only Linux's XDG locations differ from macOS.
function linuxMonitor(Base,onStateChange,{configHome,product}){
  const monitor=new Base(onStateChange);
  monitor._baseDir=path.join(configHome,product,'logs');
  return monitor;
}
module.exports={linuxMonitor};
