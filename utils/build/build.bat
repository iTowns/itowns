@ECHO OFF

echo Node.js and require.js needed
call r.js.cmd -o build.js optimize=none
echo minify...
call r.js.cmd -o build_minify.js
echo END
