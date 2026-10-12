# art/

Pictures that take over from the game's own drawing, for everyone (`js/03h-art.js`). They come from the game's
Settings › Display › Your art: Export art gives a .zip whose `editable/` pictures each sit in a fixed frame (its README
says which), they're edited, and the edited .zip is applied here with

    node tools/art-apply.mjs path/to/edited.zip

which copies only the pictures that changed (the zip's `originals.json` says what the game drew) and rewrites
`manifest.json`, the list the game loads (the live build inlines it). Delete a picture and run
`node tools/art-apply.mjs --manifest` to hand that thing back to the game's own drawing.
