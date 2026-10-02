/* BOOT: runs last, once every module is loaded */
document.body.classList.toggle('calm', !!SETTINGS.reduceMotion);
if (IS_TOUCH) enableTouch();
fit(); loadMap(0); showMenu(); requestAnimationFrame(frame);
