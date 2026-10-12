/* BOOT: runs last, once every module is loaded */
document.body.classList.toggle('calm', !!SETTINGS.reduceMotion);
if (IS_TOUCH) enableTouch();
fit(); artReadyBy(4000).then(() => { loadMap(0); showMenu(); requestAnimationFrame(frame); }); // your art first (03h-art: only waits when there is some to load)
