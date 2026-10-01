/* BOOT: runs last, once every module is loaded */
document.body.classList.toggle('calm', !!SETTINGS.reduceMotion);
fit(); loadMap(0); showMenu(); requestAnimationFrame(frame);
